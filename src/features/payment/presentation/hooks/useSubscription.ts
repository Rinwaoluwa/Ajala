import { useQuery } from '@tanstack/react-query';

import { subscriptionRepository } from '../../paymentModule';

/** The plan as a query, so every screen shares one answer; cleared with the cache on sign-out. */
export const subscriptionKey = ['payment', 'subscription'] as const;

export function useSubscription() {
  const query = useQuery({
    queryKey: subscriptionKey,
    queryFn: () => subscriptionRepository.getTier(),
    staleTime: 5 * 60_000,
  });
  return { isPro: query.data === 'pro', loading: query.isPending };
}
