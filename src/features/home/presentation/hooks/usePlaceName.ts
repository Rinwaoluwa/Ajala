import { useQuery } from '@tanstack/react-query';

import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * The name of a place known only by id: `MeDto.teleport` is `{ placeId }`
 * with no label (spec §8 Q1). Only asked when nothing else can name it: the
 * feed's `origin.label` does once a page lands, and a teleport made in this
 * run seeds the cache itself (`useTravelMove`). Cached for the whole run, as a
 * place's name doesn't change and each lookup is billed.
 *
 * Null while unknown, when `placeId` is null, or when the lookup fails (the
 * header then waits for the feed).
 */
export function usePlaceName(placeId: string | null): string | null {
  const { placeName } = useHomeUseCases();
  const query = useQuery({
    queryKey: feedKeys.placeName(placeId ?? ''),
    queryFn: ({ signal }) => placeName(placeId!, signal),
    enabled: placeId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return placeId ? (query.data ?? null) : null;
}

/**
 * The city at a point ("London"), for the header over the phone's own location:
 * the feed's `origin.region` is the state or region ("England"). Keyed to about
 * a kilometre and cached for the run, as each lookup is billed. Null while
 * unknown, without a point, or when no city is found (the header then shows
 * the region).
 */
export function useCityNameAt(point: { lat: number; lng: number } | null): string | null {
  const { cityNameAt } = useHomeUseCases();
  const lat = point?.lat ?? 0;
  const lng = point?.lng ?? 0;
  const query = useQuery({
    queryKey: feedKeys.cityAt(lat, lng),
    queryFn: () => cityNameAt(lat, lng),
    enabled: point !== null,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  return point ? (query.data ?? null) : null;
}
