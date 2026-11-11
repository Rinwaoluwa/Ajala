import { useQuery } from '@tanstack/react-query';

import { NOT_SUBSCRIBED } from '../../domain/entities/Subscription';
import { subscriptionKey, usePaymentUseCases } from '../state/usePaymentUseCases';

/**
 * The person's Travel subscription (`GET /me/subscription`) as one shared
 * query, so Home's PRO tag, Travel and the paywall always agree.
 *
 * `isPro` is the server's `subscribed` — true through a payment grace period,
 * as the API says. Until it answers, or if it cannot, the person reads as not
 * subscribed: the worst that does is show the paywall, never a teleport that
 * the server would refuse anyway (402).
 *
 * `fresh` asks again whenever the caller mounts (the paywall, which may have
 * opened because a teleport just came back 402), and whenever the app comes back
 * to the front while it is shown: someone who paid in the browser returns to
 * find Travel on.
 */
export function useSubscription({ fresh = false }: { fresh?: boolean } = {}) {
  const { loadSubscription } = usePaymentUseCases();
  const query = useQuery({
    queryKey: subscriptionKey,
    queryFn: loadSubscription,
    staleTime: 5 * 60_000,
    refetchOnMount: fresh ? 'always' : true,
    refetchOnWindowFocus: fresh ? 'always' : true,
  });
  const subscription = query.data ?? NOT_SUBSCRIBED;
  return {
    isPro: subscription.subscribed,
    subscription,
    loading: query.isPending,
  };
}
