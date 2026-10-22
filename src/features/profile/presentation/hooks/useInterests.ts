import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

import { MAX_INTERESTS, canContinueInterests, toggle } from '../../domain/rules/profileSetupRules';
import { profileKeys } from '../state/profileQueries';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * View model for "What are you into?": the server's interests (`GET /interests`,
 * in its order) and the 5–8 the person picks. The list is a query cached for an
 * hour — it is a short, server-curated list that rarely changes. Loading and a
 * failed load are states of their own, with a retry.
 */
export function useInterests() {
  const { useCases, draft, update } = useProfileSetup();
  const list = useQuery({
    queryKey: profileKeys.interests,
    queryFn: () => useCases.listInterests(),
    staleTime: 60 * 60_000,
  });

  const selected = draft.interestIds;
  const choose = useCallback(
    (id: string) => update({ interestIds: toggle(selected, id, MAX_INTERESTS), skippedInterests: false }),
    [selected, update],
  );

  return {
    interests: list.data ?? null,
    loading: list.isPending,
    failed: list.isError,
    retry: () => void list.refetch(),
    selected,
    full: selected.length >= MAX_INTERESTS,
    canContinue: canContinueInterests(selected.length),
    choose,
    skip: () => update({ skippedInterests: true }),
    keep: () => update({ skippedInterests: false }),
  };
}
