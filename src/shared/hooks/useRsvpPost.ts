import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApiRequester, type ApiRequester } from '../state/apiRequester';
import { postRsvps, useRsvpOverride, type RsvpState } from '../state/postRsvps';

import { explorePostKey, postAttendeesKey, postPageKey } from '../state/postQueryKeys';
import { haptics } from '../feedback/haptics';

/**
 * The quick RSVP on a post card: `POST /posts/{id}/rsvp` to join (the server
 * answers with the state it put the person in — going, requested on a private
 * post, or waitlisted when it is full), `DELETE` to leave (spec §2.13).
 *
 * Optimistic: the mark fills the moment it is tapped, on every card showing
 * that post (`postRsvps`), and goes back if the server refuses — the post has
 * started, it is the person's own, or they were removed. Success refreshes the
 * post page, the person's RSVPs and the attendee lists.
 *
 * `initialState` is the server's `rsvpState` from the card the caller drew.
 * `joined` is whether the person has a foot in the door at all (going,
 * requested or waitlisted): what the card's mark shows.
 */
export function useRsvpPost(postId: string, initialState: RsvpState = 'none') {
  const request = useApiRequester();
  const queryClient = useQueryClient();
  const override = useRsvpOverride(postId);
  const state = override ?? initialState;
  const mutation = useMutation(rsvpPostMutation(postId, request, queryClient));

  const { mutate, isPending } = mutation;
  const join = useCallback(() => {
    if (!isPending) mutate(true);
  }, [isPending, mutate]);
  const leave = useCallback(() => {
    if (!isPending) mutate(false);
  }, [isPending, mutate]);

  return {
    state,
    joined: state === 'going' || state === 'requested' || state === 'waitlisted',
    /** Declined or removed: the host said no, so the card offers nothing. */
    closed: state === 'declined' || state === 'removed',
    join,
    leave,
    pending: isPending,
    failed: mutation.isError,
  };
}

type RsvpAnswer = { state: RsvpState };
type Rollback = { previous: RsvpState | undefined };

/** The mutation apart from React, testable against a bare `QueryClient`. True joins, false leaves. */
export function rsvpPostMutation(
  postId: string,
  request: ApiRequester,
  queryClient: QueryClient,
): UseMutationOptions<RsvpAnswer | void, Error, boolean, Rollback> {
  const path = `/api/v1/posts/${encodeURIComponent(postId)}/rsvp`;
  return {
    mutationKey: ['rsvpPost', postId],
    scope: { id: `rsvpPost:${postId}` },
    mutationFn: (next) =>
      next ? request<RsvpAnswer>({ method: 'POST', path }) : request<void>({ method: 'DELETE', path }),
    onMutate: (next) => {
      const previous = postRsvps.get(postId);
      // Going is the usual answer; a private or full post is corrected by the server below.
      postRsvps.set(postId, next ? 'going' : 'none');
      return { previous };
    },
    onError: (_error, _next, rollback) => {
      postRsvps.set(postId, rollback?.previous);
    },
    onSuccess: (answer, next) => {
      if (next) haptics.success();
      if (next && answer && answer.state) postRsvps.set(postId, answer.state);
      // Not awaited: the card is settled; whatever else shows this post catches up.
      for (const queryKey of [
        postPageKey(postId),
        explorePostKey(postId),
        postAttendeesKey(postId),
        ['trips'],
        ['profile', 'rsvps'],
      ] as const) {
        void queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    },
  };
}
