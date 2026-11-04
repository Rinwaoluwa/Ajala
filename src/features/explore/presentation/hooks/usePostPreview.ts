import { useQuery } from '@tanstack/react-query';

import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/** The post behind a tapped pin (`GET /posts/:id`): the pin alone has no photo or counts. */
export function usePostPreview(postId: string | null) {
  const { loadPost } = useExploreUseCases();
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
  return {
    post: query.data ?? null,
    loading: query.isPending && postId !== null,
    error,
    retry: () => void query.refetch(),
  };
}
