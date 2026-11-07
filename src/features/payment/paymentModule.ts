import type { SubscriptionRequest } from './data/datasources/remote/subscriptionApi';
import { createSubscriptionRepository } from './data/repositories/SubscriptionRepositoryImpl';
import { makeLoadSubscription, makeWebPortalUrl } from './domain/usecases/SubscriptionUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createPaymentUseCases(request: SubscriptionRequest) {
  const repo = createSubscriptionRepository(request);
  return {
    loadSubscription: makeLoadSubscription(repo),
    webPortalUrl: makeWebPortalUrl(repo),
  };
}

export type PaymentUseCases = ReturnType<typeof createPaymentUseCases>;
