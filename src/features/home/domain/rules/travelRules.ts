/**
 * Travel's rules, apart from any screen.
 *
 * A city is matched by id when both sides have one, and by name otherwise: the
 * Travel screen opens with the feed's city from route params, and the person's
 * own city may only be known by name.
 */

export type TravelPlace = { id?: string; name: string; countryCode: string };

/** How many past teleports "Recent" keeps. */
export const MAX_RECENT_TRAVELS = 3;

export function sameCity(a: TravelPlace | null | undefined, b: TravelPlace | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.id && b.id) return a.id === b.id;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

/** What tapping a city in Travel does. */
export type TravelChoice =
  /** It is where the feed already is: just close. */
  | { kind: 'stay' }
  /** Not subscribed: the paywall, for that city. */
  | { kind: 'paywall' }
  /** The person's own city while teleported elsewhere: `DELETE /me/teleport`. */
  | { kind: 'returnHome' }
  | { kind: 'teleport'; cityId: string };

export function travelChoice(
  city: TravelPlace,
  here: TravelPlace,
  home: TravelPlace | null,
  subscribed: boolean,
): TravelChoice {
  if (sameCity(city, here)) return { kind: 'stay' };
  // Coming home needs no subscription: a lapsed subscriber must always be able to.
  if (sameCity(city, home)) return { kind: 'returnHome' };
  if (!subscribed) return { kind: 'paywall' };
  // Every city Travel lists comes from the catalogue, so it has an id; a name-only
  // one (the opening city) is always `here` or `home`, handled above.
  return city.id ? { kind: 'teleport', cityId: city.id } : { kind: 'stay' };
}

/** The newest destination first, each once, at most `MAX_RECENT_TRAVELS`. */
export function addRecent<T extends TravelPlace>(recent: readonly T[], city: T): T[] {
  return [city, ...recent.filter((c) => !sameCity(c, city))].slice(0, MAX_RECENT_TRAVELS);
}
