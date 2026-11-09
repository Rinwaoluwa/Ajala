/**
 * Travel's rules, apart from any screen.
 *
 * There are no cities in the API any more, only Google place ids, and the
 * feed without a teleport looks around the phone, not around a city. So
 * Travel has two kinds of choice: "where you are" (the phone: coming home is
 * `DELETE /me/teleport`) and a city, matched by its place id.
 */

/** How many past teleports "Recent" keeps. Swagger has no popular-cities list, so this and search are all Travel offers. */
export const MAX_RECENT_TRAVELS = 5;

/** Search starts from this many characters; fewer would be billed for useless suggestions. */
export const MIN_CITY_SEARCH = 2;

/** What the person tapped: their own location, or a city by place id. */
export type TravelPick = { kind: 'here' } | { kind: 'city'; placeId: string };

/** What tapping it does. */
export type TravelChoice =
  /** It is where the feed already is: just close. */
  | { kind: 'stay' }
  /** Not subscribed: the paywall, for that city. */
  | { kind: 'paywall' }
  /** Back to the phone's location while teleported: `DELETE /me/teleport`. */
  | { kind: 'returnHome' }
  | { kind: 'teleport'; placeId: string };

/**
 * Where the feed is now: on a teleport or not, and the teleport's place id
 * once `GET /me` has said (before that, only the feed's word that it is
 * teleported is known).
 */
export type TravelHere = { teleported: boolean; placeId: string | null };

export function travelChoice(pick: TravelPick, here: TravelHere, subscribed: boolean): TravelChoice {
  // Coming home needs no subscription: a lapsed subscriber must always be able to.
  if (pick.kind === 'here') return here.teleported ? { kind: 'returnHome' } : { kind: 'stay' };
  if (here.teleported && pick.placeId === here.placeId) return { kind: 'stay' };
  if (!subscribed) return { kind: 'paywall' };
  return { kind: 'teleport', placeId: pick.placeId };
}

/** The newest destination first, each once, at most `MAX_RECENT_TRAVELS`. */
export function addRecent<T extends { placeId: string }>(recent: readonly T[], city: T): T[] {
  return [city, ...recent.filter((c) => c.placeId !== city.placeId)].slice(0, MAX_RECENT_TRAVELS);
}

/**
 * The short name of a place label for the header's big line: "Accra" from
 * "Accra, Ghana". The full label still goes in "Teleported to …".
 */
export function shortPlaceName(label: string): string {
  return label.split(',')[0]?.trim() || label.trim();
}
