import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';
import { usePullRefresh } from '@shared/hooks/usePullRefresh';

import { isProfileError } from '../../domain/entities/ProfileError';
import { badgeProgress, profileCounters, streakDays, topBadges } from '../../domain/rules/achievementRules';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';
import { useMyRsvps } from './useMyRsvps';

/**
 * View model for the Profile tab: `GET /me` (the shared cache profile setup and
 * Edit profile also write), the attended history the counters and badge
 * preview are worked out from, and the Going / Requested tabs
 * (`GET /me/rsvps`). Each is a separate query, so the page draws as soon as
 * `/me` lands and the rest fill in after.
 */
export function useOwnProfile() {
  const useCases = useProfileViewUseCases();
  const me = useQuery({ queryKey: sharedQueryKeys.me, queryFn: () => useCases.getMyProfile() });
  const history = useQuery({ queryKey: profileKeys.myHistory, queryFn: () => useCases.loadMyHistory() });
  const rsvps = useMyRsvps();

  const derived = useMemo(() => {
    if (!history.data) return null;
    const progress = badgeProgress(history.data);
    return {
      counters: { ...profileCounters(history.data), streak: streakDays(history.data) },
      preview: topBadges(progress),
      earned: progress.filter((p) => p.earned).length,
      inProgress: progress.filter((p) => !p.earned && p.done > 0).length,
    };
  }, [history.data]);

  const { refetch: refetchMe } = me;
  const { refetch: refetchHistory } = history;
  const { refetch: refetchRsvps } = rsvps;
  const reload = useCallback(
    () => Promise.all([refetchMe(), refetchHistory(), refetchRsvps()]),
    [refetchMe, refetchHistory, refetchRsvps],
  );
  const pull = usePullRefresh(reload);

  return {
    profile: me.data ?? null,
    loading: me.isPending,
    failed: me.isError,
    /** The read never got an answer (offline), as opposed to the server refusing. */
    networkFailure: isProfileError(me.error) && me.error.code === 'network',
    retry: () => void reload(),
    /** A pull to refresh; background refreshes stay out of sight. */
    refreshing: pull.refreshing,
    refresh: pull.refresh,
    derived,
    rsvps,
  };
}
