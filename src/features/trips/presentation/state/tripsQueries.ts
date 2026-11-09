/**
 * The Trips feature's TanStack Query keys, under `trips`. Upcoming is two
 * lists (going and hosted) merged on the phone, so each source has its own
 * key; `waiting` is the Requests tab (requests, then waitlists, one query).
 * Post detail invalidates `['trips']` after an RSVP, which refreshes all.
 */
export type TripsSource = 'going' | 'hosted' | 'waiting' | 'past';

export const tripsKeys = {
  all: ['trips'] as const,
  list: (source: TripsSource) => ['trips', source] as const,
};
