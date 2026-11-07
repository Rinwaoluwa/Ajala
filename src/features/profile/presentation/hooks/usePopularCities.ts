import { useQuery } from '@tanstack/react-query';

import { profileKeys } from '../state/profileQueries';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * The destinations step's chips: `GET /cities/popular`, up to 12 cities with
 * the most live posts. The server refreshes the list every 10 minutes, so it is
 * kept for 10 minutes here too; loading and a failed load are states of their
 * own, with a retry (the search still works meanwhile).
 */
export function usePopularCities() {
  const { useCases } = useProfileSetup();
  const list = useQuery({
    queryKey: profileKeys.popularCities,
    queryFn: () => useCases.listPopularCities(),
    staleTime: 10 * 60_000,
  });
  return {
    cities: list.data ?? [],
    loading: list.isPending,
    failed: list.isError,
    retry: () => void list.refetch(),
  };
}
