import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * "Meetups Near You": `GET /explore/meetups`, meetups only, an interest counting
 * double (spec §2.11). One cache per interest, paged by cursor.
 */
export function useNearbyMeetups(interestId: string | null) {
  const { loadMeetups } = useExploreUseCases();
  const query = useInfiniteQuery({
    queryKey: exploreKeys.meetups(interestId),
    queryFn: ({ pageParam }) => loadMeetups(interestId, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages ?? [])
      .flatMap((p) => p.items)
      .filter((m) => !seen.has(m.id) && !!seen.add(m.id));
  }, [query.data]);

  return {
    items,
    loading: query.isPending,
    failed: query.isError && items.length === 0,
    loadingMore: query.isFetchingNextPage,
    retry: () => void query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
