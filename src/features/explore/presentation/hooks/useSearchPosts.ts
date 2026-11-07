import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { SEARCH_RESULT_CAP } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The Explore list's search (`GET /search/posts?q=`), for words already
 * submitted — search runs on submit, never as the person types (spec §2.18).
 * `words` null means no search: nothing is asked.
 *
 * Paged by cursor; the server stops at 100 results, and `capped` says when the
 * person has reached them, so the list can suggest narrowing the search.
 */
export function useSearchPosts(words: string | null) {
  const { searchPosts } = useExploreUseCases();
  const query = useInfiniteQuery({
    queryKey: exploreKeys.search(words ?? ''),
    queryFn: ({ pageParam }) => searchPosts(words ?? '', pageParam),
    enabled: words !== null,
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
    query.error && items.length === 0
      ? isExploreError(query.error)
        ? query.error.code
        : 'unknown'
      : null;

  return {
    items,
    loading: words !== null && query.isPending,
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
