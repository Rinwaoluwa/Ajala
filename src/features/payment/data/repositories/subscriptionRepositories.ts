import type { SubscriptionRepository } from '../../domain/entities/Subscription';

/**
 * No subscription endpoint exists yet (API map §12: in-app purchase is a later
 * feature), so the answer is always "free". Replace this with the store receipt /
 * backend check when purchase is built.
 */
export const liveSubscriptionRepository: SubscriptionRepository = {
  getTier: async () => 'free',
};
