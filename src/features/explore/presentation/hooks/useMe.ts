import { useQuery } from '@tanstack/react-query';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The signed-in person, as Explore reads them (`GET /me`): their id, to spot
 * their own posts, and their interests, for the chips over the map. Read once
 * a session: a changed interest is a profile edit, which invalidates `['me']`
 * elsewhere; here the chips catch up on the next launch or sign-in.
 */
export function useMe() {
  const { getMe } = useExploreUseCases();
  return useQuery({ queryKey: exploreKeys.me, queryFn: () => getMe(), staleTime: 5 * 60_000 });
}
