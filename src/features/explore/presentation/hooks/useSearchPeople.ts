import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { SEARCH_RESULT_CAP } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The Explore list's people search (`GET /search/people?q=`), for words already
 * submitted, as the post search beside it. `words` null asks nothing.
 * `enabled` false holds it back until the People tab is opened.
 */
export function useSearchPeople(words: string | null, enabled: boolean) {
  const { searchPeople } = useExploreUseCases();
  const query = useInfiniteQuery({
    queryKey: exploreKeys.people(words ?? ''),
    queryFn: ({ pageParam }) => searchPeople(words ?? '', pageParam),
    enabled: words !== null && enabled,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((m) => !seen.has(m.id) && !!seen.add(m.id));
  }, [query.data]);

  const error: ExploreErrorCode | null =
    query.error && items.length === 0 ? (isExploreError(query.error) ? query.error.code : 'unknown') : null;

  return {
    items,
    loading: words !== null && enabled && query.isPending,
    error,
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    capped: !query.hasNextPage && items.length >= SEARCH_RESULT_CAP,
    retry: () => void query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
