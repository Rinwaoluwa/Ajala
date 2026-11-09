import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { PostCardModel } from '@shared/components';

import type { ProfileActivity, SavedFilter } from '../../domain/entities/PublicProfile';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/**
 * View model for "Saved activities": `GET /me/saved?type=`, newest save first,
 * an infinite query per filter under `['saved', type]`.
 *
 * Unsaving happens on the card's own bookmark (the shared `useSavePost`): it
 * flips at once, and on success refreshes every `['saved', …]` query, so the
 * card leaves this list once the server agrees. Cancelled posts stay listed, as
 * the API keeps them.
 */
export function useSavedActivities() {
  const useCases = useProfileViewUseCases();
  const [filter, setFilter] = useState<SavedFilter>('all');

  const list = useInfiniteQuery({
    queryKey: profileKeys.saved(filter),
    queryFn: ({ pageParam }) => useCases.loadSaved(filter, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items.map(toPostCard)) ?? [], [list.data]);

  return {
    filter,
    setFilter,
    items,
    loading: list.isPending,
    // A failed refresh over a list already shown keeps the list; only a first load fails the screen.
    failed: list.isError && !list.data,
    retry: () => void list.refetch(),
    refreshing: list.isRefetching && !list.isFetchingNextPage,
    refresh: () => void list.refetch(),
    loadingMore: list.isFetchingNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },
  };
}

/** The shared post card, with the server's `saved` so the bookmark starts filled. */
function toPostCard(a: ProfileActivity): PostCardModel {
  return {
    id: a.id,
    type: a.type,
    title: a.title,
    imageUrl: a.imageUrl,
    startAt: a.startAt,
    placeName: a.placeName ?? a.locality?.label ?? null,
    host: { name: a.host.name, avatarUrl: a.host.avatarUrl },
    distanceKm: a.distanceKm,
    saved: a.saved,
  };
}
