import { useMutation } from '@tanstack/react-query';
import { Linking } from 'react-native';

import type { Subscription } from '../../domain/entities/Subscription';
import { isSubscriptionError, type SubscriptionErrorCode } from '../../domain/entities/SubscriptionError';
import { manageAction } from '../../domain/rules/subscriptionRules';
import { usePaymentUseCases } from '../state/usePaymentUseCases';

/** The link could not be opened on this phone (no browser or store app to take it). */
type OpenFailed = 'openFailed';

/**
 * "Manage subscription" (spec §2.19): a store subscription opens the App Store's
 * or Play's own subscription settings, where it is changed or cancelled; a web
 * one asks the API for a one-time billing portal link (`POST
 * /me/subscription/portal`) and opens it. A complimentary one has nothing to
 * manage, so `available` is false.
 *
 * A mutation, not a query: the portal link is single use and made on demand.
 */
export function useManageSubscription(subscription: Subscription) {
  const { webPortalUrl } = usePaymentUseCases();
  const action = manageAction(subscription);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!action) return;
      const url = action.kind === 'openUrl' ? action.url : await webPortalUrl();
      try {
        await Linking.openURL(url);
      } catch {
        throw new Error('openFailed');
      }
    },
  });

  const error: SubscriptionErrorCode | OpenFailed | null = mutation.error
    ? isSubscriptionError(mutation.error)
      ? mutation.error.code
      : mutation.error.message === 'openFailed'
        ? 'openFailed'
        : 'unknown'
    : null;

  return {
    available: action !== null,
    manage: () => mutation.mutate(),
    opening: mutation.isPending,
    error,
  };
}
