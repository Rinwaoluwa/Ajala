import type { WaitingCursor, WaitingPage } from '../entities/Trip';
import type { TripsRepository } from '../repositories/TripsRepository';
import { TRIPS_PAGE_SIZE, TRIP_FACES, myPosts, upcomingOnly } from '../rules/tripRules';

/**
 * A page of what I host that has not ended. Filtered here because the API
 * lists every hosted post; the cursor is kept, so paging carries on even when
 * a page filters down to nothing.
 */
export const makeLoadHostedUpcoming = (repo: TripsRepository) => async (cursor: string | null) => {
  const page = await repo.listHosted(cursor, TRIPS_PAGE_SIZE);
  return { items: upcomingOnly(page.items), nextCursor: page.nextCursor };
};

/**
 * A page of My posts: everything I host, newest first, past ones included
 * (`GET /me/posts`, the list Upcoming filters). The cursor is kept, as above.
 */
export const makeLoadMyPosts = (repo: TripsRepository) => async (cursor: string | null) => {
  const page = await repo.listHosted(cursor, TRIPS_PAGE_SIZE);
  return { items: myPosts(page.items), nextCursor: page.nextCursor };
};

/** A page of live posts I'm going to that haven't ended, soonest first. */
export const makeLoadGoing = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listRsvps('going', cursor, TRIPS_PAGE_SIZE);

/**
 * A page of the Requests tab: everything I'm waiting to get into. First the
 * private posts I asked to join that the host hasn't answered
 * (`/me/rsvps?state=requested`), then the full posts whose waitlist I'm on
 * (`state=waitlisted`, backend answers B8). Requests come first because a
 * person has to answer them; a waitlist moves by itself.
 *
 * When the requests run out part-way through a page, the first page of the
 * waitlist is read straight away and added, so a short (or empty) list of
 * requests never leaves the tab looking empty while waitlisted posts exist.
 */
export const makeLoadWaiting =
  (repo: TripsRepository) =>
  async (at: WaitingCursor | null): Promise<WaitingPage> => {
    const from: WaitingCursor = at ?? { state: 'requested', cursor: null };
    const page = await repo.listRsvps(from.state, from.cursor, TRIPS_PAGE_SIZE);
    if (page.nextCursor) return { items: page.items, nextCursor: { state: from.state, cursor: page.nextCursor } };
    if (from.state === 'waitlisted') return { items: page.items, nextCursor: null };
    const waitlist = await repo.listRsvps('waitlisted', null, TRIPS_PAGE_SIZE);
    return {
      items: [...page.items, ...waitlist.items],
      nextCursor: waitlist.nextCursor ? { state: 'waitlisted', cursor: waitlist.nextCursor } : null,
    };
  };

/**
 * The first few people going to a trip, for the faces on its card. A list card
 * says how many are going but not who (backend request B18), so a card on
 * screen asks for them.
 */
export const makeLoadTravellerFaces = (repo: TripsRepository) => (postId: string) =>
  repo.listGoingFaces(postId, TRIP_FACES);

/** A page of what I went to. */
export const makeLoadPast = (repo: TripsRepository) => (cursor: string | null) =>
  repo.listAttended(cursor, TRIPS_PAGE_SIZE);
