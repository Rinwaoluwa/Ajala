import { useCallback, useMemo } from 'react';

import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';
import { useDevicePostList } from './useDevicePostList';

/**
 * The heart on a feed post. The API has no likes yet (backend request B12), so
 * a like is remembered on this phone, for this account (`PostListStore`): it
 * fills the heart for the person who tapped it and rolls the count beside it up
 * by one (their own like, the only one the phone knows about). The host does
 * not see it.
 *
 * When the API has likes this hook is where it changes: `liked` and the count
 * from the card, and `toggle` a call to the server.
 */
export function useLikedPosts(userId: string | null) {
  const { likedPosts } = useHomeUseCases();
  const { ids, change } = useDevicePostList(likedPosts, feedKeys.likedPosts(userId ?? ''), userId);
  const toggle = useCallback(
    (postId: string) =>
      change((now) => (now.includes(postId) ? now.filter((id) => id !== postId) : [...now, postId])),
    [change],
  );
  return useMemo(() => ({ liked: new Set(ids), toggle }), [ids, toggle]);
}
