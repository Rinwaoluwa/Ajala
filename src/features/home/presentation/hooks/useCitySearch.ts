import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * Teleport's city search (`GET /cities?q=`): asked once typing pauses for
 * 300ms, from two characters. Each query's answer is cached for five minutes —
 * the catalogue barely changes — so retyping or going back is instant.
 */
export function useCitySearch() {
  const { searchCities } = useHomeUseCases();
  const [query, setQuery] = useState('');
  const settled = useDebouncedValue(query.trim(), 300);
  const active = query.trim().length >= 2;

  const result = useQuery({
    queryKey: feedKeys.cities(settled),
    queryFn: () => searchCities(settled),
    enabled: settled.length >= 2,
    staleTime: 5 * 60_000,
  });

  const current = active && settled === query.trim();
  return {
    setQuery,
    active,
    results: current ? (result.data ?? null) : null,
    searching: active && (!current || result.isFetching),
  };
}
