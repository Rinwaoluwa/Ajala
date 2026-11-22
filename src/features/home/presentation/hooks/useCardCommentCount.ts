import { useQuery } from '@tanstack/react-query';

import { postCommentCountKey } from '@shared/state/postQueryKeys';

import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * How many comments a feed post has, for its comment button. The feed's cards
 * don't carry the count yet (backend request B11), so a post on screen asks the
 * comments endpoint for it, once per post (five minutes fresh).
 *
 * The key is shared (`postCommentCountKey`): the post page writes its own total
 * there, so a comment added or deleted shows on the feed straight away.
 *
 * Null until known, or when it could not be read (the button then has no number).
 */
export function useCardCommentCount(postId: string): number | null {
  const { loadPostCommentCount } = useHomeUseCases();
  const query = useQuery({
    queryKey: postCommentCountKey(postId),
    queryFn: () => loadPostCommentCount(postId),
    staleTime: 5 * 60_000,
  });
  return query.data ?? null;
}
