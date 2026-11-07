/**
 * The person's Travel subscription (spec §2.19, `MySubscriptionDto`). Travel
 * lets a subscriber teleport the feed, map and search to any city.
 */

/** `pro` is a Travel subscriber; kept as the word the rest of the app gates on. */
export type SubscriptionTier = 'free' | 'pro';

/** Where it was bought; `comp` is complimentary (given by Ajala, nothing to manage). */
export type SubscriptionPlatform = 'apple' | 'google' | 'stripe' | 'comp';

/** `grace` is the store retrying a failed payment: still subscribed meanwhile. */
export type SubscriptionStatus = 'active' | 'grace' | 'expired' | 'refunded';

/** Where it is managed: the phone's App Store or Play settings, or the web billing portal. */
export type ManagedIn = 'apple' | 'google' | 'web';

export type Subscription = {
  subscribed: boolean;
  platform: SubscriptionPlatform | null;
  status: SubscriptionStatus | null;
  /** ISO date-time the current period ends (renews, or stops). */
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  manage: ManagedIn | null;
};

export const NOT_SUBSCRIBED: Subscription = {
  subscribed: false,
  platform: null,
  status: null,
  currentPeriodEnd: null,
  autoRenew: false,
  manage: null,
};
