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
 * A paid Event never RSVPs: its link opens, after counting the click for the
 * host. If the server says a post books externally after all, the link opens too.
 */
export function useJoinPost() {
  const { join, recordLinkClick } = useExploreUseCases();
  const queryClient = useQueryClient();

  const openLink = async (post: PostPreview) => {
    if (!post.externalUrl) return;
    await recordLinkClick(post.id);
    await Linking.openURL(post.externalUrl).catch(() => undefined);
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
    onError: (e, post, context) => {
      queryClient.setQueryData(exploreKeys.post(post.id), context?.previous);
      if (isExploreError(e) && e.code === 'externalBooking') void openLink(post);
      void queryClient.invalidateQueries({ queryKey: exploreKeys.post(post.id) });
    },
  });

  const error: ExploreErrorCode | null = mutation.error
    ? isExploreError(mutation.error)
      ? mutation.error.code
      : 'unknown'
    : null;

  return {
    join: (post: PostPreview) => mutation.mutate(post),
    book: (post: PostPreview) => void openLink(post),
    joining: mutation.isPending,
    /** For the post it was about; cleared when another card opens. */
    error: error === 'externalBooking' ? null : error,
    errorFor: mutation.variables?.id ?? null,
    reset: mutation.reset,
  };
}
