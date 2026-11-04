import { liveSubscriptionRepository } from './data/repositories/subscriptionRepositories';

/** The feature's composition root: which repository answers for the plan. */
export const subscriptionRepository = liveSubscriptionRepository;
