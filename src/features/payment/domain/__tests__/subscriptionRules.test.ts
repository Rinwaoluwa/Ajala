import { describe, expect, it } from '@jest/globals';

import { NOT_SUBSCRIBED, type Subscription } from '../entities/Subscription';
import { STORE_SUBSCRIPTION_SETTINGS, manageAction, subscriptionSummary } from '../rules/subscriptionRules';

const END = '2026-12-06T10:00:00Z';
const live = (over: Partial<Subscription>): Subscription => ({
  subscribed: true,
  platform: 'apple',
  status: 'active',
  currentPeriodEnd: END,
  autoRenew: true,
  manage: 'apple',
  ...over,
});

describe('subscription summary', () => {
  it('is nothing without a subscription', () => {
    expect(subscriptionSummary(NOT_SUBSCRIBED)).toBeNull();
  });

  it('renews, or ends when auto-renew is off', () => {
    expect(subscriptionSummary(live({}))).toEqual({ kind: 'renews', on: END });
    expect(subscriptionSummary(live({ autoRenew: false }))).toEqual({ kind: 'ends', on: END });
  });

  it('says so in a payment grace period, and for a complimentary one', () => {
    expect(subscriptionSummary(live({ status: 'grace' }))).toEqual({ kind: 'grace', on: END });
    expect(subscriptionSummary(live({ platform: 'comp', manage: null }))).toEqual({
      kind: 'complimentary',
      until: END,
    });
  });
});

describe('manage', () => {
  it('opens the store it was bought in, or the web portal', () => {
    expect(manageAction(live({ manage: 'apple' }))).toEqual({
      kind: 'openUrl',
      url: STORE_SUBSCRIPTION_SETTINGS.apple,
    });
    expect(manageAction(live({ manage: 'google' }))).toEqual({
      kind: 'openUrl',
      url: 'https://play.google.com/store/account/subscriptions',
    });
    expect(manageAction(live({ manage: 'web', platform: 'stripe' }))).toEqual({ kind: 'webPortal' });
  });

  it('has nothing to manage for a complimentary subscription', () => {
    expect(manageAction(live({ platform: 'comp', manage: null }))).toBeNull();
  });
});
