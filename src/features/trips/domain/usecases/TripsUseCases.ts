import type { TripsRepository } from '../repositories/TripsRepository';
import { TRIPS_PAGE_SIZE, upcomingOnly } from '../rules/tripRules';

/** A page of what I host that is still to come (filtered here: the API lists every hosted post). */
export const makeLoadUpcoming = (repo: TripsRepository) => async (cursor: string | null) => {
  const page = await repo.listHosted(cursor, TRIPS_PAGE_SIZE);
  return { items: upcomingOnly(page.items), nextCursor: page.nextCursor };
};

/** A page of what I went to. */
export const makeLoadPast = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listAttended(cursor, TRIPS_PAGE_SIZE);
