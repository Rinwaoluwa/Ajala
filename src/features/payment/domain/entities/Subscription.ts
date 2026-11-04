/**
 * The person's plan. `pro` is Travel Pro: browse any city's feed. The
 * backend has no subscriptions yet (API map §12), so for now everyone
 * is on `free`.
 */
export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionRepository {
  getTier(): Promise<SubscriptionTier>;
}
