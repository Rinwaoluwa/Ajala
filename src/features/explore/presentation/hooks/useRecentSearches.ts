import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { withRecentSearch, withoutRecentSearch } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';
import { useMe } from './useMe';

const NONE: readonly string[] = [];

/**
 * The searches this person ran in the Explore list, most recent first, kept on
 * this phone (`RecentSearchStore`). The search box offers them when it is
 * opened, so searching again is one tap.
 *
 * Read once per account and changed at once on screen, saved behind the change.
 * Until the account is known nothing is read or saved.
 */
export function useRecentSearches() {
  const { recentSearches } = useExploreUseCases();
  const queryClient = useQueryClient();
  const userId = useMe().data?.id ?? null;
  const key = exploreKeys.recentSearches(userId ?? '');
  const saved = useQuery({
    queryKey: key,
    queryFn: () => recentSearches.list(userId!),
    enabled: userId !== null,
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const { mutate } = useMutation({
    mutationFn: (next: readonly string[]) => (userId ? recentSearches.save(userId, next) : Promise.resolve()),
  });
  const items = saved.data ?? NONE;

  const change = useCallback(
    (to: (now: readonly string[]) => string[]) => {
      if (!userId) return;
      const at = exploreKeys.recentSearches(userId);
      const next = to(queryClient.getQueryData<readonly string[]>(at) ?? NONE);
      queryClient.setQueryData(at, next);
      mutate(next);
    },
    [queryClient, mutate, userId],
  );

  return {
    items,
    add: useCallback((words: string) => change((now) => withRecentSearch(now, words)), [change]),
    remove: useCallback((words: string) => change((now) => withoutRecentSearch(now, words)), [change]),
    clear: useCallback(() => change(() => []), [change]),
  };
}
