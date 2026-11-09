import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { isFeedError } from '../../domain/entities/FeedError';
import { MIN_CITY_SEARCH } from '../../domain/rules/travelRules';
import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * Travel's city search, with the place search on the phone (`@core/places`,
 * cities only; the API has no `/cities` any more). Asked once typing pauses for
 * 300ms, from two characters. A search typing has overtaken is cancelled
 * (TanStack Query aborts its `signal`), so a slow answer for "Ac" never lands
 * over "Accra".
 *
 * Each answer is cached for five minutes, so retyping or going back is instant
 * and costs nothing. Closing Travel ends the billing session (`endCitySearch`):
 * picking a suggestion needs only its place id, so no Place Details call ends it.
 *
 * `failed` is a place search that could not run (no key, Google refused,
 * offline): "Place search isn't available right now".
 */
export function useCitySearch() {
  const { searchCities, endCitySearch } = useHomeUseCases();
  const [query, setQuery] = useState('');
  const settled = useDebouncedValue(query.trim(), 300);
  const active = query.trim().length >= MIN_CITY_SEARCH;

  useEffect(() => endCitySearch, [endCitySearch]);

  const result = useQuery({
    queryKey: feedKeys.cities(settled),
    queryFn: ({ signal }) => searchCities(settled, signal),
    enabled: settled.length >= MIN_CITY_SEARCH,
    staleTime: 5 * 60_000,
    // A refused key or no connection won't fix itself in a second; say so at once.
    retry: false,
  });

  const current = active && settled === query.trim();
  return {
    setQuery,
    active,
    results: current ? (result.data ?? null) : null,
    searching: active && (!current || result.isFetching),
    failed: current && result.isError,
    /** Whether the failure is the place search itself, rather than anything else. */
    placesDown: current && isFeedError(result.error) && result.error.code === 'placesUnavailable',
    retry: () => void result.refetch(),
  };
}
