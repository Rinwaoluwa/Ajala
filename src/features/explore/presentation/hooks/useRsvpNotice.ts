import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { exploreKeys } from '../state/exploreQueries';
import { useExploreUseCases } from '../state/useExploreUseCases';

/**
 * "Before you RSVP": shown before someone's first RSVP on this phone, then
 * remembered. Until the stored answer is read it counts as unseen.
 */
export function useRsvpNotice() {
  const { rsvpNotice } = useExploreUseCases();
  const queryClient = useQueryClient();
  const seen = useQuery({ queryKey: exploreKeys.rsvpNotice, queryFn: rsvpNotice.seen, staleTime: Infinity });
  const acknowledge = useCallback(() => {
    queryClient.setQueryData(exploreKeys.rsvpNotice, true);
    void rsvpNotice.acknowledge();
  }, [queryClient, rsvpNotice]);
  return { seen: seen.data === true, acknowledge };
}
