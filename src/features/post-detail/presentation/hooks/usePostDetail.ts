import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Linking } from 'react-native';

import type { AttendeesPage, PostDetail, RsvpResult } from '../../domain/entities/PostDetail';
import { isPostDetailError, type PostDetailErrorCode } from '../../domain/entities/PostDetailError';
import { expectJoin, expectLeave, joinAction, withRsvp } from '../../domain/rules/postDetailRules';
import { LISTS_SHOWING_POSTS, postDetailKeys } from '../state/postDetailQueries';
import { usePostDetailUseCases } from '../state/usePostDetailUseCases';

const codeOf = (e: unknown): PostDetailErrorCode | null =>
  e ? (isPostDetailError(e) ? e.code : 'unknown') : null;

/**
 * View model for the post page (API map §6): the post (`GET /posts/:id`), who is
 * going, and joining or leaving.
 *
 * Joining is optimistic (spec §7): the button and the going count change at
 * once, the answer corrects them, and an error puts the page back as it was and
 * says why. A paid Event is booked through its link instead — opened, and the
 * click counted for the host.
 */
export function usePostDetail(postId: string) {
  const useCases = usePostDetailUseCases();
  const queryClient = useQueryClient();
  const key = postDetailKeys.post(postId);

  const post = useQuery({ queryKey: key, queryFn: () => useCases.getPost(postId), staleTime: 30_000 });

  const going = useInfiniteQuery({
    queryKey: postDetailKeys.attendees(postId, 'going'),
    queryFn: ({ pageParam }) => useCases.getAttendees(postId, 'going', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: AttendeesPage) => last.nextCursor,
    enabled: post.isSuccess,
  });

  // Requests are the host's only (403 otherwise), so only the host asks.
  const isHost = post.data?.isHost ?? false;
  const requested = useInfiniteQuery({
    queryKey: postDetailKeys.attendees(postId, 'requested'),
    queryFn: ({ pageParam }) => useCases.getAttendees(postId, 'requested', pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last: AttendeesPage) => last.nextCursor,
    enabled: isHost && post.data?.visibility === 'private',
  });

  const viewer = useQuery({
    queryKey: postDetailKeys.viewer,
    queryFn: useCases.getViewer,
    staleTime: 5 * 60_000,
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
    onSuccess: (result) => {
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

  const book = async () => {
    const link = post.data?.externalUrl;
    if (!link) return;
    void useCases.recordLinkClick(postId);
    await Linking.openURL(link).catch(() => undefined);
  };

  return {
    post: post.data ?? null,
    loading: post.isPending,
    error: codeOf(post.error),
    retry: () => void post.refetch(),
    refreshing: post.isRefetching,
    refresh: () => {
      void post.refetch();
      refreshPeople();
    },
    action: post.data ? joinAction(post.data) : null,
    viewer: viewer.data ?? null,

    people,
    peopleLoading: going.isPending && post.isSuccess,
    peopleError: codeOf(going.error),
    retryPeople: () => void going.refetch(),
    hasMorePeople: going.hasNextPage,
    loadMorePeople: () => {
      if (going.hasNextPage && !going.isFetchingNextPage) void going.fetchNextPage();
    },

    join: () => {
      // Open the link first when the post has one (spec §2.13), then hold the spot.
      if (post.data?.externalUrl) void book();
      rsvp.mutate('join');
    },
    leave: () => rsvp.mutate('leave'),
    book,
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
