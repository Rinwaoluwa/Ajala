import { useMutation } from '@tanstack/react-query';

import { isExploreError, type ExploreErrorCode } from '../../domain/entities/ExploreError';
import type { ReportReasonKey } from '../../domain/rules/exploreRules';
import { useExploreUseCases } from '../state/useExploreUseCases';

/** "Report activity": `POST /posts/:id/report`, answered 202 (spec §2.12). */
export function useReportPost() {
  const { reportPost } = useExploreUseCases();
  const mutation = useMutation({
    mutationFn: (input: { postId: string; keys: ReportReasonKey[]; details: string }) =>
      reportPost(input.postId, input.keys, input.details),
  });
  const error: ExploreErrorCode | null = mutation.error
    ? isExploreError(mutation.error)
      ? mutation.error.code
      : 'unknown'
    : null;
  return {
    submit: mutation.mutateAsync,
    submitting: mutation.isPending,
    error,
    reset: mutation.reset,
  };
}
