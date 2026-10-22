import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { profileKeys } from '../state/profileQueries';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * City search as the person types (`GET /cities?q=`), for "Current city" and
 * the destinations search: asked once typing pauses for 300ms, from two
 * characters. Answers are cached per query for five minutes, so going back over
 * a search is instant, and only the answer for what is in the field now shows.
 */
const DEBOUNCE_MS = 300;

export function useCitySearch(limit = 10) {
  const { useCases } = useProfileSetup();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const settled = useDebouncedValue(q, DEBOUNCE_MS);
  const tooShort = q.length < 2;

  const result = useQuery({
    queryKey: [...profileKeys.citySearch(settled), limit],
    queryFn: () => useCases.searchCities(settled, limit),
    enabled: settled.length >= 2,
    staleTime: 5 * 60_000,
  });

  const current = !tooShort && settled === q && !result.isFetching;

  return {
    query,
    setQuery,
    results: current ? (result.data ?? []) : [],
    searching: !tooShort && !current,
    failed: current && result.isError,
    tooShort,
    clear: useCallback(() => setQuery(''), []),
  };
}
