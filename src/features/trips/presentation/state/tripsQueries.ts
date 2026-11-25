/**
 * The Trips feature's TanStack Query keys, under `trips`. Upcoming is two
 * lists (going and hosted) merged on the phone, so each source has its own
 * key; `waiting` is the Requests tab (requests, then waitlists, one query);
 * `mine` is My posts (everything hosted, where `hosted` keeps only what has
 * not ended).
 * Post detail invalidates `['trips']` after an RSVP, which refreshes all.
 */
export type TripsSource = 'going' | 'hosted' | 'waiting' | 'past' | 'mine';

export const tripsKeys = {
  all: ['trips'] as const,
  list: (source: TripsSource) => ['trips', source] as const,
  /** The faces on a trip's card. Under `trips`, so joining or leaving a post refreshes them too. */
  faces: (postId: string) => ['trips', 'faces', postId] as const,
};
