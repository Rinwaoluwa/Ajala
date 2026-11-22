import { currencyExponent, currencyInfo } from './currencies';
import { deviceCurrency, deviceLocale } from './locale';

/**
 * Writing and reading money, the same way everywhere in the app.
 *
 *   - Any currency (ISO 4217), with its own number of decimals: two for most,
 *     none for the yen, three for the Kuwaiti dinar.
 *   - The number is written the way the phone's region writes numbers
 *     ("12,000.50" or "12.000,50"), and the mark goes where that region puts it.
 *   - The mark is the currency's sign or code from the app's own table
 *     (`currencies.ts`), not the engine's: the engines on iOS, Android and in
 *     tests disagree ("NGN 12,000" against "₦12,000"), and a bare "$" for a
 *     Canadian price misleads someone in Nigeria. A currency that is the
 *     phone's own may use its short mark ("$" in Canada).
 *   - A whole amount is written without decimals ("₦12,000", "$20"); anything
 *     else with all of them ("$20.50").
 */

export type MoneyOptions = {
  /** How numbers are written. The phone's own when left out. */
  locale?: string;
  /** The currency to treat as the reader's own (it may use its short mark). The phone's when left out. */
  home?: string;
};

const NBSP = ' ';

const numberFormats = new Map<string, Intl.NumberFormat | null>();
function numberFormat(locale: string, minDecimals: number, maxDecimals: number): Intl.NumberFormat | null {
  const key = `${locale}|${minDecimals}|${maxDecimals}`;
  if (!numberFormats.has(key)) {
    let format: Intl.NumberFormat | null = null;
    try {
      format = new Intl.NumberFormat(locale, {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals,
      });
    } catch {
      format = null;
    }
    numberFormats.set(key, format);
  }
  return numberFormats.get(key) ?? null;
}

/** The number alone, in the region's style; grouped by hand if the engine cannot. */
function writeNumber(amount: number, decimals: number, locale: string): string {
  const whole = Number.isInteger(amount);
  const format = numberFormat(locale, whole ? 0 : decimals, decimals);
  if (format) {
    try {
      return format.format(amount);
    } catch {
      // Falls through to the plain form.
    }
  }
  const [units = '0', fraction] = (whole ? amount.toFixed(0) : amount.toFixed(decimals)).split('.');
  return `${units.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction}` : ''}`;
}

type Separators = { group: string; decimal: string; markFirst: boolean };
const separatorsByLocale = new Map<string, Separators>();

/** How a region writes numbers: its grouping and decimal marks, and which side the currency goes. */
export function separatorsOf(locale: string = deviceLocale()): Separators {
  const cached = separatorsByLocale.get(locale);
  if (cached) return cached;
  let found: Separators = { group: ',', decimal: '.', markFirst: true };
  try {
    const sample = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(
      1234567.5,
    );
    // "1,234,567.5": the mark before the last digit is the decimal one, the first other mark the grouping.
    const decimal = sample.slice(-2, -1);
    const group = sample.replace(/\d/g, '').replace(decimal, '').slice(0, 1);
    let markFirst = true;
    try {
      const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', currencyDisplay: 'code' }).format(1);
      markFirst = !/\d[^\d]*USD/.test(money);
    } catch {
      markFirst = true;
    }
    if (decimal && !/\d/.test(decimal)) found = { group: group || '', decimal, markFirst };
  } catch {
    // Keep the plain form.
  }
  separatorsByLocale.set(locale, found);
  return found;
}

/** The mark a currency is written with: its own short one when it is the reader's currency. */
export function currencyMark(currency: string, options: MoneyOptions = {}): string {
  const info = currencyInfo(currency);
  const home = options.home ?? deviceCurrency();
  return info.own && info.code === home.toUpperCase() ? info.own : info.symbol;
}

/**
 * An amount in the currency's whole units, written out: "₦12,000", "$20.50",
 * "KSh 1,500", "12.000,50 €".
 */
export function formatAmount(amount: number, currency: string, options: MoneyOptions = {}): string {
  const locale = options.locale ?? deviceLocale();
  const number = writeNumber(amount, currencyExponent(currency), locale);
  const mark = currencyMark(currency, options);
  if (!separatorsOf(locale).markFirst) return `${number}${NBSP}${mark}`;
  // A sign sits against the number ("₦12,000"); letters keep a space ("KSh 1,500", "AED 50").
  return /[\p{L}.]$/u.test(mark) ? `${mark}${NBSP}${number}` : `${mark}${number}`;
}

/**
 * An amount in the currency's smallest unit (kobo, cents, yen), as the API
 * sends it (spec §1.5): `minor / 10 ** exponent`. The server's `exponent` wins
 * when given; the table's otherwise.
 */
export function formatMinor(
  minor: number,
  currency: string,
  exponent: number | null = null,
  options: MoneyOptions = {},
): string {
  const decimals = exponent ?? currencyExponent(currency);
  const locale = options.locale ?? deviceLocale();
  const amount = minor / 10 ** decimals;
  const number = writeNumber(amount, decimals, locale);
  const mark = currencyMark(currency, options);
  if (!separatorsOf(locale).markFirst) return `${number}${NBSP}${mark}`;
  return /[\p{L}.]$/u.test(mark) ? `${mark}${NBSP}${number}` : `${mark}${number}`;
}

/**
 * What someone typed as an amount, in the currency's smallest unit; null when
 * it is not an amount this currency can have.
 *
 * Reads it the way people write it: with or without grouping ("12,000",
 * "12 000"), with either decimal mark ("20.50", "20,50"), in the phone's style
 * or the other one. More decimals than the currency has ("20.505" dollars,
 * "500.5" yen) is not an amount.
 */
export function parseAmount(text: string, currency: string, options: MoneyOptions = {}): number | null {
  const typed = text.replace(/[\s  '’]/g, '');
  if (!typed || !/^[\d.,]+$/.test(typed) || !/\d/.test(typed)) return null;
  const decimals = currencyExponent(currency);
  const { group } = separatorsOf(options.locale ?? deviceLocale());

  const dots = typed.split('.').length - 1;
  const commas = typed.split(',').length - 1;
  let decimalMark: string | null = null;
  if (dots > 0 && commas > 0) {
    // Both: the later one is the decimal mark, the other groups.
    decimalMark = typed.lastIndexOf('.') > typed.lastIndexOf(',') ? '.' : ',';
    if ((decimalMark === '.' ? dots : commas) > 1) return null;
  } else if (dots + commas === 1) {
    const mark = dots ? '.' : ',';
    const after = typed.length - typed.indexOf(mark) - 1;
    // "12,000" where "," groups is twelve thousand; anything else is a decimal mark.
    const groups = mark === group && after === 3 && decimals !== 3 && typed.indexOf(mark) > 0;
    decimalMark = groups ? null : mark;
  }
  // One kind of mark, more than once ("1,000,000"): grouping.

  const [units = '', fraction = ''] = decimalMark ? typed.split(decimalMark) : [typed, ''];
  // Grouping, where there is any, is in threes with one kind of mark ("1,000,000", not "1.2.3").
  if (/[.,]/.test(units) && !/^\d{1,3}(?:,\d{3})+$|^\d{1,3}(?:\.\d{3})+$/.test(units)) return null;
  const wholeDigits = units.replace(/[.,]/g, '');
  if (!/^\d*$/.test(wholeDigits) || !/^\d*$/.test(fraction)) return null;
  if (!wholeDigits && !fraction) return null;
  // Trailing zeros past the currency's decimals say nothing ("500.0" yen); anything else is too fine.
  const kept = fraction.slice(0, decimals);
  if (/[1-9]/.test(fraction.slice(decimals))) return null;
  const minor = Number(wholeDigits || '0') * 10 ** decimals + Number(kept.padEnd(decimals, '0') || '0');
  return Number.isSafeInteger(minor) ? minor : null;
}

/**
 * An amount in the smallest unit, as text for an amount field: no grouping, the
 * phone's decimal mark, decimals only when there are some ("5000", "20.50").
 */
export function amountAsInput(minor: number, currency: string, options: MoneyOptions = {}): string {
  const decimals = currencyExponent(currency);
  const amount = minor / 10 ** decimals;
  if (decimals === 0 || Number.isInteger(amount)) return String(Math.round(amount));
  return amount.toFixed(decimals).replace('.', separatorsOf(options.locale ?? deviceLocale()).decimal);
}

/** The keys an amount field needs: digits alone where the currency has no decimals. */
export const amountKeyboard = (currency: string): 'number-pad' | 'decimal-pad' =>
  currencyExponent(currency) === 0 ? 'number-pad' : 'decimal-pad';

/**
 * Round amounts to offer as one-tap choices in a currency (a "maximum price"
 * filter), in whole units: 1×, 2×, 5× and 10× a step that suits what things
 * cost in it. The steps are orders of size, not exchange rates: they only have
 * to be round and in the right region.
 */
const PRESET_STEPS: Record<string, number> = {
  NGN: 5_000,
  GHS: 50,
  KES: 500,
  ZAR: 100,
  UGX: 20_000,
  TZS: 10_000,
  RWF: 5_000,
  XOF: 2_000,
  XAF: 2_000,
  EGP: 200,
  MAD: 50,
  ETB: 500,
  ZMW: 100,
  BWP: 50,
  MUR: 200,
  INR: 500,
  PKR: 1_000,
  BDT: 500,
  LKR: 1_000,
  JPY: 1_000,
  CNY: 50,
  KRW: 10_000,
  IDR: 100_000,
  VND: 100_000,
  PHP: 200,
  THB: 200,
  MYR: 20,
  HKD: 50,
  TWD: 200,
  AED: 20,
  SAR: 20,
  QAR: 20,
  ILS: 20,
  TRY: 200,
  BRL: 20,
  MXN: 100,
  ARS: 5_000,
  COP: 20_000,
  CLP: 5_000,
  SEK: 50,
  NOK: 50,
  DKK: 50,
  PLN: 20,
  CZK: 100,
  HUF: 2_000,
  RON: 20,
  UAH: 200,
  RUB: 500,
};

export function pricePresets(currency: string): readonly number[] {
  const code = currency.toUpperCase();
  const decimals = currencyExponent(code);
  const step = PRESET_STEPS[code] ?? (decimals === 0 ? 1_000 : decimals === 3 ? 5 : 10);
  return [step, step * 2, step * 5, step * 10];
}
