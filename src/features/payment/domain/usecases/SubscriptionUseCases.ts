import type { SubscriptionRepository } from '../repositories/SubscriptionRepository';

/** The person's subscription, fresh from the server (it is what gates teleport). */
export const makeLoadSubscription = (repo: SubscriptionRepository) => () => repo.get();

/** A link to the web billing portal, for a subscription bought on the web. */
export const makeWebPortalUrl = (repo: SubscriptionRepository) => () => repo.portalUrl();
