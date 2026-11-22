/**
 * Exchange rates, for showing a price's rough equivalent in the reader's own
 * currency ("≈ €8.50" beside "₦15,000"). The only file that knows where they
 * come from.
 *
 * The Ajala API has no rates (backend request B15), so they are read from a
 * public, key-less daily table: the open `currency-api` dataset, from its CDN
 * and, if that does not answer, from its mirror. The request carries nothing
 * about the person or the app: it is a plain GET of a public file.
 *
 * They are day-old mid-market rates, good for "about how much is that", not for
 * charging anyone: the app never takes payment, and every converted amount is
 * shown as an estimate beside the real price. When neither source answers, the
 * caller simply shows no estimate.
 *
 * To move to the API's own rates when it has them, change this file only.
 */

const SOURCES = [
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json',
  'https://latest.currency-api.pages.dev/v1/currencies/usd.min.json',
] as const;
const TIMEOUT_MS = 8000;

export type UsdRates = {
  /** The day the rates are for (YYYY-MM-DD); null if the source did not say. */
  date: string | null;
  /** How many of each currency one US dollar buys, by ISO code ("NGN": 1353.02). */
  perUsd: Record<string, number>;
};

type SourceBody = { date?: unknown; usd?: Record<string, unknown> };

async function readSource(url: string, signal?: AbortSignal): Promise<UsdRates> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  signal?.addEventListener('abort', onCallerAbort);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Rates answered ${response.status}.`);
    const body = (await response.json()) as SourceBody;
    const perUsd: Record<string, number> = { USD: 1 };
    for (const [code, rate] of Object.entries(body.usd ?? {})) {
      // Currencies only (three letters), with a rate that can be divided by.
      if (/^[a-z]{3}$/i.test(code) && typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
        perUsd[code.toUpperCase()] = rate;
      }
    }
    if (Object.keys(perUsd).length < 20) throw new Error('Rates came back without the currencies.');
    return { date: typeof body.date === 'string' ? body.date : null, perUsd };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}

/** Today's rates against the US dollar. Rejects when no source answers. */
export async function fetchUsdRates(signal?: AbortSignal): Promise<UsdRates> {
  let failure: unknown = null;
  for (const url of SOURCES) {
    try {
      return await readSource(url, signal);
    } catch (e) {
      if (signal?.aborted) throw e;
      failure = e;
    }
  }
  if (__DEV__) console.warn(`[fx] no rates: ${failure instanceof Error ? failure.message : String(failure)}`);
  throw failure instanceof Error ? failure : new Error('No exchange rates.');
}
