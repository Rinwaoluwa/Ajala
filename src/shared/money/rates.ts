import { currencyExponent } from './currencies';
import { formatAmount, type MoneyOptions } from './money';

/**
 * Turning a price into its rough equivalent in another currency, for a reader
 * who thinks in that one ("₦15,000" is "≈ €8.50").
 *
 * The rates are how many of each currency one US dollar buys, so any pair goes
 * through the dollar. They are a day old and mid-market: every result here is
 * an estimate, rounded like one and written with "≈", and is only ever shown
 * beside the real price, never instead of it.
 */

export type ExchangeRates = {
  /** How many of each currency one US dollar buys, by ISO code. */
  perUsd: Readonly<Record<string, number>>;
  /** The day the rates are for (YYYY-MM-DD), when known. */
  date: string | null;
};

/** An amount (whole units) in another currency; null when either rate is missing. */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRates | null | undefined,
): number | null {
  const source = from.toUpperCase();
  const target = to.toUpperCase();
  if (source === target) return amount;
  const perSource = rates?.perUsd[source];
  const perTarget = rates?.perUsd[target];
  if (!perSource || !perTarget || !(perSource > 0) || !(perTarget > 0)) return null;
  return (amount / perSource) * perTarget;
}

/**
 * An estimate, rounded the way one is read: to the currency's own decimals
 * under 100 ("≈ €8.50"), and to whole units from there up ("≈ ₦15,200"), where
 * the small change would only pretend to be exact.
 */
export function roundEstimate(amount: number, currency: string): number {
  const decimals = amount >= 100 ? 0 : currencyExponent(currency);
  const unit = 10 ** decimals;
  return Math.round(amount * unit) / unit;
}

/**
 * "≈ €8.50": a price in its smallest unit, as about that much of `to`. Null
 * when it is already in that currency, or there is no rate for the pair.
 */
export function formatEquivalent(
  minor: number,
  exponent: number | null,
  from: string,
  to: string,
  rates: ExchangeRates | null | undefined,
  options: MoneyOptions = {},
): string | null {
  if (from.toUpperCase() === to.toUpperCase()) return null;
  const amount = minor / 10 ** (exponent ?? currencyExponent(from));
  const converted = convertAmount(amount, from, to, rates);
  if (converted === null || !Number.isFinite(converted)) return null;
  return `≈ ${formatAmount(roundEstimate(converted, to), to, options)}`;
}
