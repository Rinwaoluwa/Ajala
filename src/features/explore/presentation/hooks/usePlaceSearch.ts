import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The map's "Search city or country...": the place search on the phone
 * (`@core/places`, cities only; `GET /cities` is gone), once typing pauses.
 * A search typing has overtaken is cancelled (the query's `signal`).
 *
 * Choosing one moves the camera (`MapSearchBar` looks up where it is). Pins
 * still come from where the server looks: a free reader panning to another
 * city sees the "within 30 km" note and Teleport.
 *
 * Clearing the box (or leaving the tab) ends the billing session; a choice
 * ends it by itself, through the location lookup.
 */
export function usePlaceSearch(text: string) {
  const { searchPlaces, placeLocation, endPlaceSearch } = useExploreUseCases();
  const query = useDebouncedValue(text.trim(), 300);

  const idle = query.length < 2;
  useEffect(() => {
    if (idle) endPlaceSearch();
  }, [idle, endPlaceSearch]);
  useEffect(() => endPlaceSearch, [endPlaceSearch]);

  const result = useQuery({
    queryKey: exploreKeys.places(query),
    queryFn: ({ signal }) => searchPlaces(query, signal),
    enabled: query.length >= 2,
    staleTime: 10 * 60_000,
    // A refused key or no connection won't fix itself in a second; say so at once.
    retry: false,
  });
  // Where a chosen city is: a suggestion carries no coordinates.
  const locate = useMutation({ mutationFn: (placeId: string) => placeLocation(placeId) });
  return {
    active: query.length >= 2,
    places: result.data ?? [],
    searching: result.isFetching,
    failed: result.isError,
    /** Where a suggestion is, or null when the lookup failed (`locateFailed` then says so). */
    locate: (placeId: string) => locate.mutateAsync(placeId).catch(() => null),
    locating: locate.isPending,
    locateFailed: locate.isError,
    resetLocate: locate.reset,
  };
}
