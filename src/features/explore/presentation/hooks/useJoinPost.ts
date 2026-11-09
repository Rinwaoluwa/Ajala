import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';

import type { PostPreview } from '../../domain/entities/Explore';
import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { optimisticJoin } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * Joining from the mini card (spec §2.13).
 *
 * RSVP is optimistic: the button says Going (or Requested) at once, then takes
 * the server's answer — or goes back, with the reason, if it refused. A full or
 * started post is re-read so the card shows its real state.
 *
 * Every post joins by RSVP. When it has a link (tickets, a booking page), joining
 * opens the link, counts the click for the host (`POST /posts/:id/link-click`),
 * then RSVPs as usual (backend answers, Nov 2026). The three start together
 * rather than waiting on each other: the link takes the person out of the app,
 * and the RSVP should not sit paused until they come back.
 */
export function useJoinPost() {
  const { join, recordLinkClick } = useExploreUseCases();
  const queryClient = useQueryClient();

  const openLink = (post: PostPreview) => {
    if (!post.externalUrl) return;
    void Linking.openURL(post.externalUrl).catch(() => undefined);
    void recordLinkClick(post.id);
  };

  const mutation = useMutation({
    mutationFn: (post: PostPreview) => join(post.id),
    onMutate: async (post) => {
      const key = exploreKeys.post(post.id);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<PostPreview>(key);
      queryClient.setQueryData<PostPreview>(key, optimisticJoin(post));
      return { previous };
    },
    onSuccess: (result, post) => {
      queryClient.setQueryData<PostPreview>(exploreKeys.post(post.id), (current) =>
        current
          ? {
              ...current,
              rsvpState: result.state,
              goingCount: result.goingCount,
              capacity: result.capacity,
              waitlistPosition: result.waitlistPosition,
            }
          : current,
      );
    },
    onError: (_e, post, context) => {
      queryClient.setQueryData(exploreKeys.post(post.id), context?.previous);
      // A refusal (full, started, or a 409 on the person's own post) means the card was
      // out of date: read it again so the button shows what the server now says.
      void queryClient.invalidateQueries({ queryKey: exploreKeys.post(post.id) });
    },
  });

  const error: ExploreErrorCode | null = mutation.error
    ? isExploreError(mutation.error)
      ? mutation.error.code
      : 'unknown'
    : null;

  return {
    join: (post: PostPreview) => {
      openLink(post);
      mutation.mutate(post);
    },
    joining: mutation.isPending,
    /** For the post it was about; cleared when another card opens. */
    error,
    errorFor: mutation.variables?.id ?? null,
    reset: mutation.reset,
  };
}
