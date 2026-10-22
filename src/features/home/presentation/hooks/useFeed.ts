import { useInfiniteQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { FeedFilter, FeedPage } from '../../domain/entities/Feed';
import { isFeedError, type FeedErrorCode } from '../../domain/entities/FeedError';
import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * View model for the home feed (API map §4): an infinite query over
 * `GET /feed`, one per post-type filter, paged by cursor.
 *
 * Cached per filter (TanStack Query): going back to a filter already seen draws
 * its cards at once and refreshes them behind. Pull to refresh refetches from
 * the first page; returning to the app refreshes a stale feed by itself.
 *
 *   - `loading`: no page yet for this filter — the skeleton shows;
 *   - `refreshing`: a pull to refresh in flight, cards still on screen;
 *   - `loadingMore`: the next page, when the list nears its end.
 *
 * The header's city comes from the first page — of this filter, or while it
 * loads, of any filter already cached.
 */
export function useFeed() {
  const { loadFeed } = useHomeUseCases();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [pulling, setPulling] = useState(false);

  const query = useInfiniteQuery({
    queryKey: feedKeys.feed(filter),
    queryFn: ({ pageParam }) => loadFeed(filter, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // The server caches cards for 10 minutes; a minute here is plenty fresh.
    staleTime: 60_000,
  });

  const items = useMemo(() => {
    // A card can move between pages while the feed updates; keep each once.
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((page) => page.items)
      .filter((p) => !seen.has(p.id) && !!seen.add(p.id));
  }, [query.data]);

  // A filter not loaded yet still has a city to show: any feed already cached knows it.
  const first =
    query.data?.pages[0] ??
    queryClient
      .getQueriesData<InfiniteData<FeedPage>>({ queryKey: feedKeys.lists })
      .map(([, data]) => data?.pages[0])
      .find(Boolean);
  const error: FeedErrorCode | null = query.error
    ? isFeedError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  return {
    filter,
    items,
    city: first?.city ?? null,
    citySource: first?.citySource ?? 'home',
    loading: query.isPending,
    refreshing: pulling && query.isRefetching,
    loadingMore: query.isFetchingNextPage,
    error,
    setFilter,
    refresh: () => {
      setPulling(true);
      void query.refetch().finally(() => setPulling(false));
    },
    retry: () => void query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
