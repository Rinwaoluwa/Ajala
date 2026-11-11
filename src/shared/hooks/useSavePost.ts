import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { useApiRequester, type ApiRequester } from '../state/apiRequester';
import { postSaves, useSavedOverride } from '../state/postSaves';
import { haptics } from '../feedback/haptics';

/**
 * The bookmark on a post: `POST /posts/{id}/save` to save, `DELETE` to unsave
 * (both 204, spec §2.12).
 *
 * Optimistic: the bookmark fills the moment it is tapped, on every card showing
 * that post (`postSaves`), and goes back if the call fails — including the 409
 * the API sends for a draft or a cancelled post. Success refreshes every
 * "Saved" list (any query key starting with `['saved']`), since the post has
 * joined or left it.
 *
 * `initialSaved` is the server's `saved` from the card the caller drew.
 */
export function useSavePost(postId: string, initialSaved = false) {
  const request = useApiRequester();
  const queryClient = useQueryClient();
  const override = useSavedOverride(postId);
  const saved = override ?? initialSaved;
  const mutation = useMutation(savePostMutation(postId, request, queryClient));

  const { mutate, isPending } = mutation;
  const toggle = useCallback(() => {
    // One call at a time per card: a second tap mid-flight would race the first's rollback.
    if (!isPending) mutate(!saved);
  }, [isPending, mutate, saved]);

  return { saved, toggle, pending: isPending };
}

/** Rolled back to whatever the card showed before the tap. */
type Rollback = { previous: boolean | undefined };

/**
 * The mutation itself, apart from React so it can be tested against a bare
 * `QueryClient`. The variable is the state to move to: true saves, false unsaves.
 */
export function savePostMutation(
  postId: string,
  request: ApiRequester,
  queryClient: QueryClient,
): UseMutationOptions<void, Error, boolean, Rollback> {
  return {
    mutationKey: ['savePost', postId],
    // Two cards of the same post send their taps in order, never side by side.
    scope: { id: `savePost:${postId}` },
    mutationFn: (next) =>
      request<void>({
        method: next ? 'POST' : 'DELETE',
        path: `/api/v1/posts/${encodeURIComponent(postId)}/save`,
      }),
    onMutate: (next) => {
      haptics.select();
      const previous = postSaves.get(postId);
      postSaves.set(postId, next);
      return { previous };
    },
    onError: (_error, _next, rollback) => {
      postSaves.set(postId, rollback?.previous);
    },
    // Not awaited: the bookmark is settled now, whether or not a Saved list is open to refetch.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['saved'] });
    },
  };
}
