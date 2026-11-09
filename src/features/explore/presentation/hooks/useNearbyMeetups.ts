import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isExploreError } from '../../domain/entities/ExploreError';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * "Meetups Near You". With an interest chosen, a post search by it, meetups
 * only (`GET /search/posts?interestIds=&type=meetup`); with none, the feed's
 * meetups (`GET /feed?type=meetup`), since search needs words or interests
 * (spec §2.11, §2.18). One cache per interest, paged by cursor.
 *
 * `noLocation`: the server answered 404 NO_LOCATION (no location, no
 * teleport), which the list shows as "turn on location", not as a failure.
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
    noLocation: isExploreError(query.error) && query.error.code === 'noLocation',
    loadingMore: query.isFetchingNextPage,
    retry: () => void query.refetch(),
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}
