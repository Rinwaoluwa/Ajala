import { useQuery } from '@tanstack/react-query';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The map's "Search city or country...": `GET /cities?q=` once typing pauses.
 * Choosing one moves the camera; pins still come from the feed's city (API map §7).
 */
export function usePlaceSearch(text: string) {
  const { searchPlaces } = useExploreUseCases();
  const query = useDebouncedValue(text.trim(), 300);
  const result = useQuery({
    queryKey: exploreKeys.places(query),
    queryFn: () => searchPlaces(query),
    enabled: query.length >= 2,
    staleTime: 10 * 60_000,
  });
  return {
    active: query.length >= 2,
    places: result.data ?? [],
    searching: result.isFetching,
  };
}
