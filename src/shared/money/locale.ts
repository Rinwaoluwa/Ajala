import { currencyOfRegion } from './regionCurrency';

/**
 * Where the phone says it is set up for: its locale ("en-NG") and, from that,
 * its region ("NG") and currency ("NGN"). Read from the JavaScript engine's own
 * `Intl`, which follows the phone's Language & Region, so no native module (and
 * no new build) is needed.
 *
 * Read once: the phone's region does not change while the app runs.
 */

/** The app's home market: the first choice when the phone will not say where it is set up for. */
export const HOME_CURRENCY = 'NGN';
const FALLBACK_LOCALE = 'en-US';

let locale: string | null = null;

export function deviceLocale(): string {
  if (locale) return locale;
  try {
    locale = new Intl.NumberFormat().resolvedOptions().locale || FALLBACK_LOCALE;
  } catch {
    locale = FALLBACK_LOCALE;
  }
  return locale;
}

/** "NG" from "en-NG", "CN" from "zh-Hans-CN", "US" from "en_US@rg=…"; null when the tag names no region. */
export function regionOf(localeTag: string): string | null {
  const parts = localeTag.split(/[-_@.]/);
  // The language comes first; the region is the first two-letter part after it.
  const region = parts.slice(1).find((part) => /^[A-Za-z]{2}$/.test(part));
  return region ? region.toUpperCase() : null;
}

export const deviceRegion = () => regionOf(deviceLocale());

/** The currency of the phone's region; the app's home market's when it has none. */
export const deviceCurrency = () => currencyOfRegion(deviceRegion()) ?? HOME_CURRENCY;

/** For tests: forget what was read, or pretend the phone is set up for somewhere. */
export function setDeviceLocaleForTests(tag: string | null): void {
  locale = tag;
}
