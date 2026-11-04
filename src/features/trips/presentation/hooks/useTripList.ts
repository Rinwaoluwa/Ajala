import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type { TripCard, TripsTab } from '../../domain/entities/Trip';
import { isTripsError, type TripsErrorCode } from '../../domain/entities/TripsError';
import { soonestFirst } from '../../domain/rules/tripRules';
import { tripsKeys } from '../state/tripsQueries';
import { useTripsUseCases } from '../state/useTripsUseCases';

/**
 * View model for one Trips list (API map §8): an infinite query per tab, paged
 * by cursor and cached, so switching tabs back is instant.
 *
 *   - Upcoming: what I host that is still to come, soonest first. The API pages
 *     every hosted post, so a page can filter down to nothing; the next page is
 *     then fetched by itself rather than showing "no plans" too soon.
 *   - Past: what I went to, latest first.
 *   - Requests: there is no endpoint (API map §12), so nothing is fetched.
 */
export function useTripList(tab: TripsTab) {
  const { loadUpcoming, loadPast } = useTripsUseCases();
  const [pulling, setPulling] = useState(false);
  const listTab = tab === 'past' ? 'past' : 'upcoming';

  const query = useInfiniteQuery({
    queryKey: tripsKeys.list(listTab),
    queryFn: ({ pageParam }) => (listTab === 'past' ? loadPast(pageParam) : loadUpcoming(pageParam)),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: tab !== 'requests',
  });

  const items: TripCard[] = useMemo(() => {
    const seen = new Set<string>();
    const all = (query.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((t) => !seen.has(t.id) && !!seen.add(t.id));
    return listTab === 'upcoming' ? all.sort(soonestFirst) : all;
  }, [query.data, listTab]);

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    if (tab === 'upcoming' && query.isSuccess && items.length === 0 && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [tab, query.isSuccess, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const error: TripsErrorCode | null = query.error
    ? isTripsError(query.error)
      ? query.error.code
      : 'unknown'
    : null;

  return {
    items,
    loading: tab !== 'requests' && (query.isPending || (items.length === 0 && !!hasNextPage)),
    refreshing: pulling && query.isRefetching,
    loadingMore: isFetchingNextPage,
    error,
    refresh: () => {
      setPulling(true);
      void query.refetch().finally(() => setPulling(false));
    },
    retry: () => void query.refetch(),
    loadMore: () => {
      if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
    },
  };
}
