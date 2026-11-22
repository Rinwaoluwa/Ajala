import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { fetchUsdRates } from '@core/fx/exchangeRates';
import { getCurrentCountry } from '@core/location/deviceLocation';
import { convertAmount, deviceLocale, deviceRegion, formatEquivalent, type ExchangeRates } from '@shared/money';
import { localCurrency, setCurrencyCountry, useLocalCurrency } from '@shared/state/preferredCurrency';

/**
 * Money in the reader's own terms: which currency they are in, and what a
 * price in another one comes to in it.
 */

/** Rates change once a day; asked again after twelve hours, and kept between launches with the rest of the cache. */
const RATES_FRESH_MS = 12 * 60 * 60_000;
/** How often, at most, the phone is asked which country it is in. */
const COUNTRY_CHECK_MS = 30 * 60_000;

export const exchangeRatesKey = ['fx', 'usd'] as const;

/**
 * Today's exchange rates, or null until they are known (and when they cannot
 * be read: callers then show no estimate). `enabled` false asks for nothing.
 */
export function useExchangeRates(enabled = true): ExchangeRates | null {
  const query = useQuery({
    queryKey: exchangeRatesKey,
    queryFn: ({ signal }) => fetchUsdRates(signal),
    staleTime: RATES_FRESH_MS,
    enabled,
  });
  return query.data ?? null;
}

type Priced = { amountCents: number; currency: string; exponent: number };

/**
 * The reader's own currency (`local`), and `equivalent(price)`: "≈ €8.50" for
 * a price in another currency, null for one already in theirs or while the
 * rates are unknown. An estimate to show beside the real price, never instead.
 */
export function useLocalMoney(enabled = true) {
  const local = useLocalCurrency();
  const rates = useExchangeRates(enabled);
  const equivalent = useCallback(
    (price: Priced | null | undefined): string | null =>
      price ? formatEquivalent(price.amountCents, price.exponent, price.currency, local, rates) : null,
    [local, rates],
  );
  /** A price in whole units of another currency (a filter's maximum), or null without a rate. */
  const inCurrency = useCallback(
    (price: Priced, to: string): number | null =>
      convertAmount(price.amountCents / 10 ** price.exponent, price.currency, to, rates),
    [rates],
  );
  return { local, rates, equivalent, inCurrency };
}

let countryCheckedAt = 0;

/**
 * Keeps the app's currency in step with where the phone is: asks the phone for
 * its country when the signed-in app opens and when it comes back to the front
 * (at most every half hour), so someone who lands in another country is in its
 * currency the next time they open the app. Mounted once, by the signed-in
 * layout. It never asks for permission.
 */
export function useCurrencyFollowsLocation(): void {
  useEffect(() => {
    let alive = true;
    const check = () => {
      const now = Date.now();
      if (now - countryCheckedAt < COUNTRY_CHECK_MS) return;
      countryCheckedAt = now;
      void getCurrentCountry().then((code) => {
        if (alive && code) setCurrencyCountry(code, 'location');
        // In the development log: where the app's currency came from.
        if (__DEV__) {
          console.log(
            `[money] the phone is in ${code ?? 'an unknown country'}; its region setting is ${deviceRegion() ?? 'not given'} (${deviceLocale()}); working in ${localCurrency()}`,
          );
        }
        // Nothing found (no permission yet, no position): ask again next time rather than wait.
        if (!code) countryCheckedAt = 0;
      });
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
}
