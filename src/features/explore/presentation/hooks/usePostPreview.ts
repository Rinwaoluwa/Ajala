import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { asSeenBy } from '../../domain/rules/exploreRules';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * The post behind a tapped pin (`GET /posts/:id`): the pin alone has no photo or
 * counts. It is read as the signed-in person sees it, so their own post never
 * offers Join (`asSeenBy`).
 */
export function usePostPreview(postId: string | null) {
  const { loadPost, getMyId } = useExploreUseCases();
  // Asked once a session; a failure just leaves the server's `isHost` to decide.
  const me = useQuery({ queryKey: exploreKeys.me, queryFn: () => getMyId(), staleTime: Infinity });
  const query = useQuery({
    queryKey: exploreKeys.post(postId ?? ''),
    queryFn: () => loadPost(postId!),
    enabled: postId !== null,
    staleTime: 30_000,
  });
  const error: ExploreErrorCode | null = query.error
    ? isExploreError(query.error)
      ? query.error.code
      : 'unknown'
    : null;
  const myId = me.data ?? null;
  const post = useMemo(() => (query.data ? asSeenBy(query.data, myId) : null), [query.data, myId]);
  return {
    post,
    loading: query.isPending && postId !== null,
    error,
    retry: () => void query.refetch(),
  };
}
