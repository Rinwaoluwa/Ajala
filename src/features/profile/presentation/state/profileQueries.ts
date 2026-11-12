import type { PersonActivityTab } from '../../domain/usecases/ProfileViewUseCases';
import type { MyRsvpTab, SavedFilter } from '../../domain/entities/PublicProfile';

/**
 * The profile feature's TanStack Query keys, under `profile` so they never meet
 * another feature's (the same endpoint mapped to a different shape would share a
 * cache entry otherwise). Two exceptions: `GET /me` is shared
 * (`sharedQueryKeys.me`), and the Saved list sits under `['saved', …]`, the
 * prefix the shared bookmark (`useSavePost`) refreshes after a save or unsave.
 */
export const profileKeys = {
  detectedCity: ['profile', 'detectedCity'] as const,
  /** Google city search (`@core/places`), per lower-cased query. */
  citySearch: (query: string, kind: 'cities' | 'destinations' = 'cities') =>
    ['profile', 'citySearch', kind, query] as const,
  interests: ['profile', 'interests'] as const,
  handle: (handle: string) => ['profile', 'handle', handle] as const,
  /** The signed-in person's whole attended history (achievements, counters). */
  myHistory: ['profile', 'history', 'me'] as const,
  person: (userId: string) => ['profile', 'person', userId] as const,
  personHistory: (userId: string) => ['profile', 'history', userId] as const,
  personActivity: (userId: string, tab: PersonActivityTab) => ['profile', 'activity', userId, tab] as const,
  /** Going / Requested (requests, then waitlists) on the own profile (`GET /me/rsvps`). */
  myRsvps: (tab: MyRsvpTab) => ['profile', 'rsvps', tab] as const,
  /** "Saved activities" (`GET /me/saved`): refreshed by the bookmark, see above. */
  saved: (filter: SavedFilter) => ['saved', filter] as const,
};
