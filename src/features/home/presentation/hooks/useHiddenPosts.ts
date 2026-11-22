import { useCallback, useMemo, useState } from 'react';

import { feedKeys } from '../state/feedQueries';
import { useHomeUseCases } from '../state/useHomeUseCases';
import { useDevicePostList } from './useDevicePostList';

const NONE: readonly string[] = [];

/**
 * "Hide post": the posts this account took out of its feed, remembered on this
 * phone (`PostListStore`; the API has no endpoint for it yet).
 *
 *   - `hide` takes a post out at once; the choice is saved behind it.
 *   - A post hidden during this visit keeps its place as one line with Undo
 *     (`justHidden`), so a slip of the thumb is put right where it happened.
 *     From the next visit on it is simply left out (`hidden`).
 */
export function useHiddenPosts(userId: string | null) {
  const { hiddenPosts } = useHomeUseCases();
  const { ids, change } = useDevicePostList(hiddenPosts, feedKeys.hiddenPosts(userId ?? ''), userId);
  // Hidden since Home opened: these keep their place, as the Undo line.
  const [session, setSession] = useState<readonly string[]>(NONE);

  const hide = useCallback(
    (postId: string) => {
      setSession((now) => (now.includes(postId) ? now : [...now, postId]));
      change((now) => (now.includes(postId) ? now : [...now, postId]));
    },
    [change],
  );
  const unhide = useCallback(
    (postId: string) => {
      setSession((now) => now.filter((id) => id !== postId));
      change((now) => now.filter((id) => id !== postId));
    },
    [change],
  );

  return useMemo(() => {
    const justHidden = new Set(session);
    return {
      /** Hidden before this visit: left out of the feed altogether. */
      hidden: new Set(ids.filter((id) => !justHidden.has(id))),
      /** Hidden during this visit: shown as the Undo line. */
      justHidden,
      hide,
      unhide,
    };
  }, [ids, session, hide, unhide]);
}
