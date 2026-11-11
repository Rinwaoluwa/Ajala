import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BLOCKED_KEY, POST_LIST_PREFIXES } from '@shared/state/postQueryKeys';
import { useMemo, useState } from 'react';

import { isProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import type { PersonReportReason } from '../../domain/entities/PublicProfile';
import { badgeProgress, profileCounters, streakDays, topBadges } from '../../domain/rules/achievementRules';
import type { PersonActivityTab } from '../../domain/usecases/ProfileViewUseCases';
import { profileKeys } from '../state/profileQueries';
import { useProfileViewUseCases } from '../state/useProfileViewUseCases';

/**
 * View model for another traveller's profile (API map §9): `GET /users/:id`,
 * their attended history (counters, badges), the Hosting / Attending lists and
 * — when they share their plans — Upcoming (`GET /users/:id/plans`), each an
 * infinite query, and blocking and reporting as mutations.
 *
 * Upcoming is offered only when `sharePlans` is on: the API answers an empty
 * list otherwise, so there is nothing to ask for.
 *
 * Blocking also refreshes the feed and the map, where the person disappears
 * (spec §2.14), and the blocked list in settings.
 */
export function usePerson(userId: string) {
  const useCases = useProfileViewUseCases();
  const queryClient = useQueryClient();
  const [chosenTab, setTab] = useState<PersonActivityTab>('hosting');

  const person = useQuery({
    queryKey: profileKeys.person(userId),
    queryFn: () => useCases.getPerson(userId),
  });
  const history = useQuery({
    queryKey: profileKeys.personHistory(userId),
    queryFn: () => useCases.loadPersonHistory(userId),
    enabled: person.isSuccess && !person.data.blockedByMe,
  });
  // If they stop sharing plans while Upcoming is open, fall back to Hosting.
  const tab: PersonActivityTab =
    chosenTab === 'plans' && person.data && !person.data.sharePlans ? 'hosting' : chosenTab;
  const activity = useInfiniteQuery({
    queryKey: profileKeys.personActivity(userId, tab),
    queryFn: ({ pageParam }) => useCases.loadPersonActivity(userId, tab, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled: person.isSuccess && !person.data.blockedByMe,
  });

  const afterBlockChange = () => {
    void queryClient.invalidateQueries({ queryKey: profileKeys.person(userId) });
    for (const prefix of [...POST_LIST_PREFIXES, BLOCKED_KEY]) {
      void queryClient.invalidateQueries({ queryKey: [...prefix] });
    }
  };
  const block = useMutation({ mutationFn: () => useCases.blockPerson(userId), onSuccess: afterBlockChange });
  const unblock = useMutation({
    mutationFn: () => useCases.unblockPerson(userId),
    onSuccess: afterBlockChange,
  });
  const report = useMutation({
    mutationFn: ({ reason, details }: { reason: PersonReportReason; details: string }) =>
      useCases.reportPerson(userId, reason, details),
  });

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

  const code = (e: unknown): ProfileErrorCode | null => (e ? (isProfileError(e) ? e.code : 'unknown') : null);

  return {
    person: person.data ?? null,
    loading: person.isPending,
    error: code(person.error),
    retry: () => void person.refetch(),
    derived,
    tab,
    setTab,
    items: activity.data?.pages.flatMap((p) => p.items) ?? [],
    activityLoading: activity.isPending && activity.fetchStatus !== 'idle',
    activityFailed: activity.isError,
    retryActivity: () => void activity.refetch(),
    loadMore: () => {
      if (activity.hasNextPage && !activity.isFetchingNextPage) void activity.fetchNextPage();
    },
    block: () => block.mutateAsync(),
    unblock: () => unblock.mutateAsync(),
    blocking: block.isPending || unblock.isPending,
    report: (reason: PersonReportReason, details: string) => report.mutateAsync({ reason, details }),
    reporting: report.isPending,
    reportError: code(report.error),
    resetReport: () => report.reset(),
  };
}
