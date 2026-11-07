import type { TripCard } from '../entities/Trip';

export const TRIPS_PAGE_SIZE = 20;

const time = (iso: string | null) => (iso ? new Date(iso).getTime() : Number.NaN);

/**
 * Hosted posts for Upcoming: the ones that have not ended. `GET /me/posts`
 * also returns past, cancelled and taken-down posts (API map §8), so the phone
 * filters. A post is over at its `endAt`, or at `startAt` when it has no end
 * (the API map's rule); that keeps a weekend I'm hosting listed while it runs,
 * as the Going list does. A taken-down post is hidden; a cancelled one stays so
 * the host sees it was called off.
 */
export function upcomingOnly(items: readonly TripCard[], now: Date = new Date()): TripCard[] {
  return items.filter((t) => {
    if (t.status === 'taken_down') return false;
    const over = time(t.endAt ?? t.startAt);
    return !Number.isNaN(over) && over > now.getTime();
  });
}

/**
 * Soonest first, for a list of what is coming up. Compared as instants, not as
 * strings, because the API may write the same moment with different offsets.
 */
export const soonestFirst = (a: TripCard, b: TripCard) => {
  const ta = time(a.startAt);
  const tb = time(b.startAt);
  // Anything without a date (a draft never reaches here, but be safe) goes last.
  if (Number.isNaN(ta)) return Number.isNaN(tb) ? 0 : 1;
  if (Number.isNaN(tb)) return -1;
  return ta - tb;
};

/**
 * Upcoming as one list: posts I'm going to and posts I host, soonest first,
 * each post once (hosting wins; the API refuses an RSVP on your own post, so
 * both should not happen).
 *
 * The going list arrives soonest first a page at a time, so a hosted post that
 * starts after the last going post loaded is held back until the next going
 * page (or the end of that list) arrives; otherwise it would sit above going
 * posts that are sooner but not loaded yet, and jump down later.
 */
export function mergeUpcoming(
  going: readonly TripCard[],
  hosted: readonly TripCard[],
  goingComplete: boolean,
): TripCard[] {
  const last = going.length > 0 ? time(going[going.length - 1]?.startAt ?? null) : Number.NaN;
  const shownHosted = goingComplete
    ? hosted
    : hosted.filter((t) => !Number.isNaN(last) && time(t.startAt) <= last);
  const seen = new Set<string>();
  return [...shownHosted, ...going].filter((t) => !seen.has(t.id) && !!seen.add(t.id)).sort(soonestFirst);
}
