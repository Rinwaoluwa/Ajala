import type { TripsRepository } from '../repositories/TripsRepository';
import { TRIPS_PAGE_SIZE, upcomingOnly } from '../rules/tripRules';

/**
 * A page of what I host that has not ended. Filtered here because the API
 * lists every hosted post; the cursor is kept, so paging carries on even when
 * a page filters down to nothing.
 */
export const makeLoadHostedUpcoming = (repo: TripsRepository) => async (cursor: string | null) => {
  const page = await repo.listHosted(cursor, TRIPS_PAGE_SIZE);
  return { items: upcomingOnly(page.items), nextCursor: page.nextCursor };
};

/** A page of live posts I'm going to that haven't ended, soonest first. */
export const makeLoadGoing = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listRsvps('going', cursor, TRIPS_PAGE_SIZE);

/** A page of private posts I asked to join that the host hasn't answered. */
export const makeLoadRequested = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listRsvps('requested', cursor, TRIPS_PAGE_SIZE);

/** A page of what I went to. */
export const makeLoadPast = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listAttended(cursor, TRIPS_PAGE_SIZE);
