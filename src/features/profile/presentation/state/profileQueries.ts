/**
 * The profile feature's TanStack Query keys, under `profile` so they never meet
 * another feature's (the same endpoint mapped to a different shape would share a
 * cache entry otherwise). `GET /me` is shared: `sharedQueryKeys.me`.
 */
export const profileKeys = {
  detectedCity: ['profile', 'detectedCity'] as const,
  citySearch: (query: string) => ['profile', 'cities', query] as const,
  interests: ['profile', 'interests'] as const,
  handle: (handle: string) => ['profile', 'handle', handle] as const,
  /** The signed-in person's whole attended history (achievements, counters). */
  myHistory: ['profile', 'history', 'me'] as const,
  person: (userId: string) => ['profile', 'person', userId] as const,
  personHistory: (userId: string) => ['profile', 'history', userId] as const,
  personActivity: (userId: string, tab: 'hosting' | 'attending') =>
    ['profile', 'activity', userId, tab] as const,
};
