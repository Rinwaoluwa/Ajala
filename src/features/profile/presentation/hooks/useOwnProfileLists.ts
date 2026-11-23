import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import type { MyRsvpTab, ProfileActivity, RsvpCursor, RsvpListState } from '../../domain/entities/PublicProfile';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/** The lists at the foot of the own profile, in the order their tabs are drawn. */
export type OwnProfileTab = 'posts' | 'saved' | 'going' | 'requested';

/** A post on one of those lists; `state` only on Going and Requested, where it picks the card's tag. */
export type OwnProfileItem = { activity: ProfileActivity; state: RsvpListState | null };

/**
 * The own profile's lists (Figma Own Profile, "My posts · Saved"), one infinite
 * query each, asked only once its tab is opened:
 *
 *   - My posts: what the person hosts, as a visitor to their profile sees it
 *     (`GET /users/:me/posts`: live posts, latest date first). The cache is the
 *     one a profile's Hosting tab uses, so a publish, an edit or a cancel
 *     refreshes it with every other list of posts.
 *   - Saved: `GET /me/saved`, newest save first, the cache "Saved activities"
 *     reads, which the bookmark refreshes.
 *   - Going and Requested: `GET /me/rsvps?state=`, soonest first, the same
 *     lists as the Trips tab. Requested is everything waiting to get in:
 *     requests, then waitlists.
 *
 * `userId` is null until `GET /me` has landed; My posts waits for it.
 */
export function useOwnProfileLists(userId: string | null) {
  const useCases = useProfileViewUseCases();
  const [tab, setTab] = useState<OwnProfileTab>('posts');

  const posts = useInfiniteQuery({
    queryKey: profileKeys.personActivity(userId ?? '', 'hosting'),
    queryFn: ({ pageParam }) => useCases.loadPersonActivity(userId ?? '', 'hosting', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: userId !== null && tab === 'posts',
  });
  const saved = useInfiniteQuery({
    queryKey: profileKeys.saved('all'),
    queryFn: ({ pageParam }) => useCases.loadSaved('all', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: tab === 'saved',
  });
  const rsvpTab: MyRsvpTab = tab === 'requested' ? 'requested' : 'going';
  const rsvps = useInfiniteQuery({
    queryKey: profileKeys.myRsvps(rsvpTab),
    queryFn: ({ pageParam }) => useCases.loadMyRsvps(rsvpTab, pageParam),
    initialPageParam: null as RsvpCursor | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: tab === 'going' || tab === 'requested',
  });

  const list = tab === 'posts' ? posts : tab === 'saved' ? saved : rsvps;
  const items: OwnProfileItem[] =
    tab === 'posts' || tab === 'saved'
      ? ((tab === 'posts' ? posts : saved).data?.pages.flatMap((p) =>
          p.items.map((activity) => ({ activity, state: null })),
        ) ?? [])
      : (rsvps.data?.pages.flatMap((p) => p.items) ?? []);

  return {
    tab,
    setTab,
    items,
    loading: list.isPending,
    // A failed refresh over a list already shown keeps the list; only a first load fails.
    failed: list.isError && !list.data,
    retry: () => void list.refetch(),
    /** The list on screen, asked again (the page's pull to refresh). */
    refetch: () => list.refetch(),
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => {
      if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
    },
  };
}
