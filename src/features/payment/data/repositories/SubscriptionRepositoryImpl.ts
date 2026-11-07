import type { SubscriptionRepository } from '../../domain/repositories/SubscriptionRepository';
import { createSubscriptionApi, type SubscriptionRequest } from '../datasources/remote/subscriptionApi';
import { toSubscription, toSubscriptionError } from '../mappers/subscriptionMappers';

/**
 * `SubscriptionRepository` over the API.
 *
 * Cache policy: none here. The subscription gates teleport, so it is read
 * network-first by the presentation layer's query; a stale "subscribed" only
 * costs a 402 that opens the paywall, which then reads it again.
 */
export function createSubscriptionRepository(request: SubscriptionRequest): SubscriptionRepository {
  const api = createSubscriptionApi(request);
  return {
    async get() {
      try {
        return toSubscription(await api.get());
      } catch (e) {
        throw toSubscriptionError(e);
      }
    },
    async portalUrl() {
      try {
        return (await api.portal()).url;
      } catch (e) {
        throw toSubscriptionError(e, 'portal');
      }
    },
  };
}
