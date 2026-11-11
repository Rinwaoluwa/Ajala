import { openInApp } from '@core/links/openInApp';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import type { AttendeesPage, PostDetail, RsvpResult } from '../../domain/entities/PostDetail';
import { isPostDetailError, type PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { asSeenBy, expectJoin, expectLeave, joinAction, withRsvp } from '../../domain/rules/postDetailRules';
import { LISTS_SHOWING_POSTS, postDetailKeys } from '../state/postDetailQueries';
import { usePostDetailUseCases } from '../state/usePostDetailUseCases';
import { haptics } from '@shared/feedback/haptics';

const codeOf = (e: unknown): PostDetailErrorCode | null =>
  e ? (isPostDetailError(e) ? e.code : 'unknown') : null;

/**
 * View model for the post page (API map §6): the post (`GET /posts/:id`), who is
 * going, and joining or leaving.
 *
 * Joining is optimistic (spec §7): the button and the going count change at
 * once, the answer corrects them, and an error puts the page back as it was and
 * says why. Every post joins by RSVP; when it has a link (tickets, a booking
 * page), joining also opens it and counts the click for the host.
 *
 * The post is read as the signed-in person sees it (`asSeenBy`), so their own
 * post never offers Join even where the server's `isHost` says otherwise.
 */
export function usePostDetail(postId: string) {
  const useCases = usePostDetailUseCases();
  const queryClient = useQueryClient();
  const key = postDetailKeys.post(postId);

  const post = useQuery({ queryKey: key, queryFn: () => useCases.getPost(postId), staleTime: 30_000 });

  const viewer = useQuery({
    queryKey: postDetailKeys.viewer,
    queryFn: useCases.getViewer,
    staleTime: 5 * 60_000,
  });
  const viewerId = viewer.data?.id ?? null;
  const seen = useMemo(() => (post.data ? asSeenBy(post.data, viewerId) : null), [post.data, viewerId]);

  // Who is going is for the host and the people going (403 otherwise), so only they ask;
  // everyone else sees the count from the post itself.
  const isHost = seen?.isHost ?? false;
  const canSeePeople = isHost || post.data?.rsvpState === 'going';
  const going = useInfiniteQuery({
    queryKey: postDetailKeys.attendees(postId, 'going'),
    queryFn: ({ pageParam }) => useCases.getAttendees(postId, 'going', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: AttendeesPage) => last.nextCursor,
    enabled: post.isSuccess && canSeePeople,
  });

  // Requests are the host's only (403 otherwise), so only the host asks.
  const requested = useInfiniteQuery({
    queryKey: postDetailKeys.attendees(postId, 'requested'),
    queryFn: ({ pageParam }) => useCases.getAttendees(postId, 'requested', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: AttendeesPage) => last.nextCursor,
    enabled: isHost && post.data?.visibility === 'private',
  });

  const refreshPeople = () =>
    void queryClient.invalidateQueries({ queryKey: postDetailKeys.attendeesOf(postId) });

  const rsvp = useMutation({
    mutationFn: async (mode: 'join' | 'leave'): Promise<RsvpResult | null> => {
      if (mode === 'join') return useCases.join(postId);
      await useCases.leave(postId);
      return null;
    },
    onMutate: async (mode) => {
      await queryClient.cancelQueries({ queryKey: key });
      const before = queryClient.getQueryData<PostDetail>(key);
      if (before)
        queryClient.setQueryData<PostDetail>(key, mode === 'join' ? expectJoin(before) : expectLeave(before));
      return { before } as { before: PostDetail | undefined };
    },
    onError: (_e, _mode, context) => {
      if (context?.before) queryClient.setQueryData(key, context.before);
    },
    onSuccess: (result, mode) => {
      if (mode === 'join') haptics.success();
      if (result) queryClient.setQueryData<PostDetail>(key, (p) => (p ? withRsvp(p, result) : p));
    },
    onSettled: (_r, error) => {
      refreshPeople();
      // A refusal means the page was out of date: ask again for the truth.
      if (error) void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const respond = useMutation({
    mutationFn: (input: { userId: string; answer: 'accept' | 'decline' }) =>
      useCases.respondToRequest(postId, input.userId, input.answer),
    onSettled: () => {
      refreshPeople();
      void queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const refreshLists = () =>
    LISTS_SHOWING_POSTS.forEach((queryKey) => void queryClient.invalidateQueries({ queryKey }));

  const cancel = useMutation({
    mutationFn: () => useCases.cancelPost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      refreshLists();
    },
  });

  const remove = useMutation({
    mutationFn: () => useCases.deletePost(postId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: key });
      refreshLists();
    },
  });

  const people = useMemo(
    () => ({
      going: going.data?.pages.flatMap((p) => p.items) ?? [],
      requested: requested.data?.pages.flatMap((p) => p.items) ?? [],
      total: going.data?.pages[0]?.counts.going ?? post.data?.goingCount ?? 0,
    }),
    [going.data, requested.data, post.data?.goingCount],
  );

  /**
   * Joining a post with a link (backend answers, Nov 2026): open the link, count
   * the click for the host, then RSVP as usual. They start together rather than
   * waiting on each other: the link opens over the app (the in-app browser),
   * and the RSVP should not sit paused until it is closed.
   */
  const join = () => {
    const link = seen?.externalUrl;
    if (link) {
      // The in-app browser, so the person stays in Ajala and comes straight back.
      void openInApp(link);
      void useCases.recordLinkClick(postId);
    }
    rsvp.mutate('join');
  };

  return {
    post: seen,
    loading: post.isPending,
    error: codeOf(post.error),
    retry: () => void post.refetch(),
    refreshing: post.isRefetching,
    refresh: () => {
      void post.refetch();
      refreshPeople();
    },
    action: seen ? joinAction(seen) : null,
    viewer: viewer.data ?? null,

    people,
    peopleLoading: going.isPending && going.fetchStatus !== 'idle',
    peopleError: codeOf(going.error),
    retryPeople: () => void going.refetch(),
    hasMorePeople: going.hasNextPage,
    loadMorePeople: () => {
      if (going.hasNextPage && !going.isFetchingNextPage) void going.fetchNextPage();
    },

    join,
    leave: () => rsvp.mutate('leave'),
    rsvpPending: rsvp.isPending,
    rsvpError: codeOf(rsvp.error),
    clearRsvpError: rsvp.reset,

    respond: respond.mutate,
    responding: respond.isPending ? (respond.variables?.userId ?? null) : null,

    cancelPost: cancel.mutateAsync,
    deletePost: remove.mutateAsync,
    hostBusy: cancel.isPending || remove.isPending,
  };
}

export type PostDetailViewModel = ReturnType<typeof usePostDetail>;
