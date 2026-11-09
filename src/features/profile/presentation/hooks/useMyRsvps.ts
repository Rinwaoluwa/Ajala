import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { MyRsvpTab, RsvpCursor } from '../../domain/entities/PublicProfile';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/**
 * The own profile's Going / Requested tabs: `GET /me/rsvps?state=`, soonest
 * first — the same lists as the Trips tab, as an infinite query per tab. Going
 * is live posts the person is going to that have not ended; Requested is
 * everything waiting to get in: private posts waiting on the host (tagged
 * Request sent), then full posts whose waitlist they are on (tagged
 * Waitlisted), as on the Trips tab's Requests.
 */
export function useMyRsvps() {
  const useCases = useProfileViewUseCases();
  const [tab, setTab] = useState<MyRsvpTab>('going');

  const list = useInfiniteQuery({
    queryKey: profileKeys.myRsvps(tab),
    queryFn: ({ pageParam }) => useCases.loadMyRsvps(tab, pageParam),
    initialPageParam: null as RsvpCursor | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  return {
    tab,
    setTab,
    items: list.data?.pages.flatMap((p) => p.items) ?? [],
    loading: list.isPending,
    failed: list.isError && !list.data,
    retry: () => void list.refetch(),
    refetch: () => list.refetch(),
    refreshing: list.isRefetching && !list.isFetchingNextPage,
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },
  };
}
