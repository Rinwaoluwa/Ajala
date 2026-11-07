import type { Subscription } from '../entities/Subscription';

/** The store screens where a subscription bought in an app is managed or cancelled (spec §2.19). */
export const STORE_SUBSCRIPTION_SETTINGS = {
  apple: 'https://apps.apple.com/account/subscriptions',
  google: 'https://play.google.com/store/account/subscriptions',
} as const;

/** What the paywall says about a live subscription, by date. */
export type SubscriptionSummary =
  | { kind: 'renews'; on: string }
  | { kind: 'ends'; on: string }
  /** The store is retrying a failed payment; Travel stays on meanwhile. */
  | { kind: 'grace'; on: string | null }
  /** Given by Ajala, not bought: nothing to renew or manage. */
  | { kind: 'complimentary'; until: string | null }
  /** Subscribed, but the server gave no date. */
  | { kind: 'active' };

export function subscriptionSummary(s: Subscription): SubscriptionSummary | null {
  if (!s.subscribed) return null;
  if (s.platform === 'comp') return { kind: 'complimentary', until: s.currentPeriodEnd };
  if (s.status === 'grace') return { kind: 'grace', on: s.currentPeriodEnd };
  if (!s.currentPeriodEnd) return { kind: 'active' };
  return s.autoRenew ? { kind: 'renews', on: s.currentPeriodEnd } : { kind: 'ends', on: s.currentPeriodEnd };
}

/**
 * How "Manage" works for this subscription: open the store's own settings
 * (App Store or Play, wherever it was bought — not where the app now runs), ask
 * the API for a web portal link, or not at all (complimentary, or none).
 */
export type ManageAction = { kind: 'openUrl'; url: string } | { kind: 'webPortal' } | null;

export function manageAction(s: Subscription): ManageAction {
  switch (s.manage) {
    case 'apple':
      return { kind: 'openUrl', url: STORE_SUBSCRIPTION_SETTINGS.apple };
    case 'google':
      return { kind: 'openUrl', url: STORE_SUBSCRIPTION_SETTINGS.google };
    case 'web':
      return { kind: 'webPortal' };
    default:
      return null;
  }
}
