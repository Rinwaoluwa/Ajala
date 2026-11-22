import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

import { currencyCode, currencyOfRegion, deviceCurrency } from '@shared/money';

/**
 * Which currency this person is in, app-wide. Two answers:
 *
 *   - `localCurrency()`: the currency of where they ARE. Prices in other
 *     currencies are given a rough equivalent in it, and it is the first
 *     choice wherever a currency is picked. In order: the country the phone is
 *     in (`setCurrencyCountry(…, 'location')`, from its location); else the
 *     country of the posts their feed is showing (`'feed'`, for someone with
 *     location off); else the phone's own region setting; else the naira, the
 *     app's home market. So it is the naira in Lagos and the euro after a
 *     flight to Paris, with nothing to set.
 *
 *   - `preferredCurrency()`: the one to start a currency choice with (a new
 *     post's price, Explore's "Maximum price"). The local currency, unless
 *     they picked another while in this same country: a pick lasts for the
 *     country it was made in, and steps aside when they travel.
 *
 * The country last seen and the pick are kept on this phone (not account
 * settings; the API has none) and read back at launch (`restorePreferredCurrency`),
 * so the app opens in the right currency before the phone has found itself again.
 */

const KEY = 'ajala.currency.v2';

type Saved = { country: string | null; chosen: { code: string; country: string | null } | null };

let located: string | null = null;
let fromFeed: string | null = null;
let remembered: string | null = null;
let chosen: Saved['chosen'] = null;

const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

const isCountry = (text: unknown): text is string => typeof text === 'string' && /^[A-Za-z]{2}$/.test(text.trim());

/** The country the app sees the person in ("NG"); null when nothing says. */
const country = (): string | null => located ?? fromFeed ?? remembered;

export const localCurrency = (): string => currencyOfRegion(country()) ?? deviceCurrency();

export const preferredCurrency = (): string =>
  chosen && chosen.country === country() ? chosen.code : localCurrency();

function save() {
  const saved: Saved = { country: country(), chosen };
  void AsyncStorage.setItem(KEY, JSON.stringify(saved)).catch(() => undefined);
}

/** Reads what was kept. Safe to call more than once. */
export async function restorePreferredCurrency(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Saved> | null;
    const before = `${localCurrency()}|${preferredCurrency()}`;
    if (isCountry(saved?.country) && !remembered) remembered = saved.country.trim().toUpperCase();
    const code = currencyCode(saved?.chosen?.code);
    if (code && !chosen) {
      chosen = { code, country: isCountry(saved?.chosen?.country) ? saved.chosen.country.trim().toUpperCase() : null };
    }
    if (before !== `${localCurrency()}|${preferredCurrency()}`) changed();
  } catch {
    // Unreadable storage: keep following the phone.
  }
}

/**
 * Where the person is ("NG"), and how the app knows: `location` is the phone's
 * own position; `feed` is the country of the posts their feed shows, used only
 * while the position is unknown. An unknown country is ignored.
 */
export function setCurrencyCountry(code: string | null | undefined, source: 'location' | 'feed'): void {
  if (!isCountry(code) || !currencyOfRegion(code)) return;
  const next = code.trim().toUpperCase();
  const before = `${localCurrency()}|${preferredCurrency()}`;
  if (source === 'location') located = next;
  else fromFeed = next;
  if (before !== `${localCurrency()}|${preferredCurrency()}`) changed();
  save();
}

/** The person picked a currency: offered first from now on, for as long as they are in this country. */
export function choosePreferredCurrency(code: string): void {
  const next = currencyCode(code);
  if (!next) return;
  const here = country();
  if (chosen?.code === next && chosen.country === here) return;
  // Picking the local one again is no pick at all: the app goes back to following where they are.
  chosen = next === localCurrency() ? null : { code: next, country: here };
  changed();
  save();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The currency to start a choice with, followed live. */
export function usePreferredCurrency(): string {
  return useSyncExternalStore(subscribe, preferredCurrency, preferredCurrency);
}

/** The currency of where the person is, followed live. */
export function useLocalCurrency(): string {
  return useSyncExternalStore(subscribe, localCurrency, localCurrency);
}

/** For tests: start again as a fresh install. */
export function resetCurrencyStateForTests(): void {
  located = null;
  fromFeed = null;
  remembered = null;
  chosen = null;
}
