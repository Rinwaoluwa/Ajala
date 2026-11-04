import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';

import { badgeProgress, profileCounters, topBadges } from '../../domain/rules/achievementRules';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/**
 * View model for the Profile tab: `GET /me` (the shared cache profile setup and
 * Edit profile also write) and the attended history the counters and badge
 * preview are worked out from. The history is a separate query, so the page
 * draws as soon as `/me` lands and the numbers fill in after.
 */
export function useOwnProfile() {
  const useCases = useProfileViewUseCases();
  const me = useQuery({ queryKey: sharedQueryKeys.me, queryFn: () => useCases.getMyProfile() });
  const history = useQuery({ queryKey: profileKeys.myHistory, queryFn: () => useCases.loadMyHistory() });

  const derived = useMemo(() => {
    if (!history.data) return null;
    const progress = badgeProgress(history.data);
    return {
      counters: profileCounters(history.data),
      preview: topBadges(progress),
      earned: progress.filter((p) => p.earned).length,
      inProgress: progress.filter((p) => !p.earned && p.done > 0).length,
    };
  }, [history.data]);

  return {
    profile: me.data ?? null,
    loading: me.isPending,
    failed: me.isError,
    retry: () => {
      void me.refetch();
      void history.refetch();
    },
    refreshing: me.isRefetching || history.isRefetching,
    derived,
  };
}
