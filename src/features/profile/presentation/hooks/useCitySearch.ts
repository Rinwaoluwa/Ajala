import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import { isProfileError } from '../../domain/entities/ProfileError';
import { profileErrorMessages } from '../copy';
import { profileKeys } from '../state/profileQueries';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * City search as the person types, for "Current city" and the destinations
 * search. The API has no city search, so this goes to Google places (through
 * the repository, `@core/places`), cities only.
 *
 * Asked once typing pauses for 300ms, from two characters, because Google
 * bills each request. A newer query cancels the one in flight (TanStack's
 * `signal`), and only the answer for what is in the field now shows. Answers
 * are cached per query for five minutes, so going back over a search is
 * instant. A failure is not retried: when Google is unreachable a second try a
 * moment later fails the same way, and the message says so.
 *
 * `finish` (a city was picked) and leaving the screen end the Google session,
 * so the next search starts a fresh one; nothing here asks for place details.
 */
const DEBOUNCE_MS = 300;

/** `destinations`: countries and regions too, for favourite destinations ("Qatar", "Bali"). */
export function useCitySearch(limit = 10, kind: 'cities' | 'destinations' = 'cities') {
  const { useCases } = useProfileSetup();
  const [query, setQuery] = useState('');
  const q = query.trim();
  const settled = useDebouncedValue(q, DEBOUNCE_MS);
  const tooShort = q.length < 2;

  const result = useQuery({
    queryKey: profileKeys.citySearch(settled.toLowerCase(), kind),
    queryFn: ({ signal }) =>
      kind === 'destinations'
        ? useCases.searchDestinations(settled, { signal })
        : useCases.searchCities(settled, { signal }),
    enabled: settled.length >= 2,
    staleTime: 5 * 60_000,
    retry: false,
  });

  useEffect(() => () => useCases.endCitySearch(), [useCases]);

  const current = !tooShort && settled === q && !result.isFetching;
  const failure = current && result.isError ? result.error : null;

  return {
    query,
    setQuery,
    results: current ? (result.data ?? []).slice(0, limit) : [],
    searching: !tooShort && !current,
    /** What to say when the search failed; null while it has not. */
    failure: failure
      ? isProfileError(failure)
        ? profileErrorMessages[failure.code]
        : profileErrorMessages.unknown
      : null,
    tooShort,
    clear: useCallback(() => setQuery(''), []),
    /** A city was picked: empty the search and end the Google session. */
    finish: useCallback(() => {
      setQuery('');
      useCases.endCitySearch();
    }, [useCases]),
  };
}
