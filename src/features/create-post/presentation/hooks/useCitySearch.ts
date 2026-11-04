import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { createPostKeys } from '../state/createPostQueries';
import { useCreatePostUseCases } from '../state/useCreatePostUseCases';

/**
 * A Plan's destination or a Group's location: `GET /cities?q=` once the person
 * pauses typing (300ms), from two letters. Each search is cached, so going back
 * over the same letters answers at once.
 */
export function useCitySearch() {
  const { searchCities } = useCreatePostUseCases();
  const [query, setQuery] = useState('');
  const settled = useDebouncedValue(query.trim(), 300);
  const enabled = settled.length >= 2;
  const results = useQuery({
    queryKey: createPostKeys.cities(settled.toLowerCase()),
    queryFn: () => searchCities(settled),
    enabled,
    staleTime: 10 * 60_000,
  });

  return {
    query,
    setQuery,
    /** Fewer than two letters: nothing is searched yet. */
    tooShort: !enabled,
    results: results.data ?? [],
    loading: enabled && results.isPending,
    failed: results.isError,
  };
}
