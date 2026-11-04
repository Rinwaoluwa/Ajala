import { useQuery } from '@tanstack/react-query';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/** "Browse By Interest": `GET /interests`, a short server-curated list cached for an hour. */
export function useInterests() {
  const { listInterests } = useExploreUseCases();
  const query = useQuery({ queryKey: exploreKeys.interests, queryFn: listInterests, staleTime: 60 * 60_000 });
  return {
    interests: query.data ?? [],
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
  };
}
