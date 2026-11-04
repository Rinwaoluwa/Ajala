import type { TripCard } from '../entities/Trip';

export const TRIPS_PAGE_SIZE = 20;

/**
 * Upcoming: hosted posts that have not started. `GET /me/posts` also returns
 * past, cancelled and taken-down posts (API map §8); a taken-down post is
 * hidden, a cancelled one stays so the host sees it was called off.
 */
export function upcomingOnly(items: readonly TripCard[], now: Date = new Date()): TripCard[] {
  return items.filter(
    (t) => t.status !== 'taken_down' && t.startAt !== null && new Date(t.startAt).getTime() > now.getTime(),
  );
}

/** Soonest first, for a list of what is coming up. */
export const soonestFirst = (a: TripCard, b: TripCard) => (a.startAt ?? '').localeCompare(b.startAt ?? '');
