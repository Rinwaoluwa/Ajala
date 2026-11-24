import { useQuery } from '@tanstack/react-query';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * A post's own words, for its card in the Explore list (`ListedPostCard`).
 *
 * The lists (`GET /feed`, `GET /search/posts`) don't carry a description
 * (backend request B10), so it is read from the post itself (`GET /posts/:id`),
 * one small call per card in the list. It is the mini card's read, under the
 * same key, so a post opened from the map and listed in the drawer is asked for
 * once. Words change rarely: a read is good for ten minutes here (as the home
 * feed's is), so opening the list again does not ask for every card again. The
 * mini card keeps its own, shorter, idea of fresh.
 *
 * `loading` holds the card's lines open until the words land; a read that fails
 * simply leaves the card without them.
 */
export function usePostDescription(postId: string) {
  const { loadPost } = useExploreUseCases();
  const query = useQuery({
    queryKey: exploreKeys.post(postId),
    queryFn: () => loadPost(postId),
    staleTime: 10 * 60_000,
    select: (post) => post.description,
  });
  return { text: query.data ? query.data : null, loading: query.isPending };
}
