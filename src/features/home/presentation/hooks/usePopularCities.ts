import { useQuery } from '@tanstack/react-query';

import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * Travel's "Popular" grid: `GET /cities/popular`, up to 12 cities with the most
 * live posts. The server refreshes the list every 10 minutes, so it is cached
 * for as long here.
 */
export function usePopularCities() {
  const { popularCities } = useHomeUseCases();
  const query = useQuery({
    queryKey: feedKeys.popularCities,
    queryFn: popularCities,
    staleTime: 10 * 60_000,
  });
  return {
    cities: query.data ?? [],
    loading: query.isPending,
    failed: query.isError && !query.data,
    retry: () => void query.refetch(),
  };
}
