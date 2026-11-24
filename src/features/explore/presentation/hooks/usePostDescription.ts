import { useQuery } from '@tanstack/react-query';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * A post's own words, for a card that has no photo to show (`TextPostCard`).
 *
 * The lists (`GET /feed`, `GET /search/posts`) don't carry a description
 * (backend request B10), so it is read from the post itself (`GET /posts/:id`),
 * one small call per text card on screen. It is the mini card's read, under the
 * same key, so a post opened from the map and listed in the drawer is asked for
 * once.
 *
 * `loading` holds the card's lines open until the words land; a read that fails
 * simply leaves the card without them.
 */
export function usePostDescription(postId: string) {
  const { loadPost } = useExploreUseCases();
  const query = useQuery({
    queryKey: exploreKeys.post(postId),
    queryFn: () => loadPost(postId),
    staleTime: 30_000,
    select: (post) => post.description,
  });
  return { text: query.data ? query.data : null, loading: query.isPending };
}
