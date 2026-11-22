import { useQuery } from '@tanstack/react-query';

import type { PostCard } from '../../domain/entities/Feed';
import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';

/**
 * The description a feed card shows under its place. The feed's cards don't
 * carry one yet (backend request B4), so a card on screen asks the post's own
 * page for it, once per post (a description changes rarely; ten minutes fresh).
 * When the feed starts sending it, the card's own copy wins and nothing is asked.
 *
 * `loading` is true while the words are still on their way, so the post can
 * hold their place open instead of jumping when they land.
 */
export function useCardDescription(post: PostCard): { text: string | null; loading: boolean } {
  const { loadPostDescription } = useHomeUseCases();
  const query = useQuery({
    queryKey: feedKeys.postDescription(post.id),
    queryFn: () => loadPostDescription(post.id),
    enabled: !post.description,
    staleTime: 10 * 60_000,
  });
  return { text: post.description ?? query.data ?? null, loading: !post.description && query.isPending };
}
