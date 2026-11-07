/**
 * The Trips feature's TanStack Query keys, under `trips`. Upcoming is two
 * lists (going and hosted) merged on the phone, so each source has its own
 * key. Post detail invalidates `['trips']` after an RSVP, which refreshes all.
 */
export type TripsSource = 'going' | 'hosted' | 'requested' | 'past';

export const tripsKeys = {
  all: ['trips'] as const,
  list: (source: TripsSource) => ['trips', source] as const,
};
