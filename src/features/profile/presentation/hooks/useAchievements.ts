import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  badgeFilter,
  badgeProgress,
  cityStamps,
  type BadgeCategory,
} from '../../domain/rules/achievementRules';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/**
 * View model for Achievements: an attended history (the same query the
 * profile page read, so it is usually cached), turned into badges and city
 * stamps on the phone (`achievementRules`). Yours, or with `userId`, another
 * traveller's.
 */
export function useAchievements(userId?: string) {
  const useCases = useProfileViewUseCases();
  const history = useQuery({
    queryKey: userId ? profileKeys.personHistory(userId) : profileKeys.myHistory,
    queryFn: () => (userId ? useCases.loadPersonHistory(userId) : useCases.loadMyHistory()),
  });
  const [filter, setFilter] = useState<BadgeCategory | 'all'>('all');

  const progress = useMemo(() => (history.data ? badgeProgress(history.data) : []), [history.data]);
  const stamps = useMemo(() => (history.data ? cityStamps(history.data) : []), [history.data]);

  return {
    loading: history.isPending,
    failed: history.isError,
    retry: () => void history.refetch(),
    filter,
    setFilter,
    badges: badgeFilter(progress, filter),
    earned: progress.filter((p) => p.earned).length,
    inProgress: progress.filter((p) => !p.earned && p.done > 0).length,
    stamps,
  };
}
