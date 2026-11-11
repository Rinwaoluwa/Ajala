import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createSubscriptionApi } from '../datasources/remote/subscriptionApi';
import { toSubscriptionError } from '../mappers/subscriptionMappers';
import { createSubscriptionRepository } from '../repositories/SubscriptionRepositoryImpl';

type Call = { method: string; path: string; body?: unknown };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { request, calls };
}

const APPLE = {
  subscribed: true,
  platform: 'apple',
  status: 'active',
  currentPeriodEnd: '2026-12-06T10:00:00Z',
  autoRenew: true,
  manage: 'apple',
};

describe('subscription repository', () => {
  it('reads the subscription from GET /me/subscription', async () => {
    const { request, calls } = fake(() => APPLE);
    const s = await createSubscriptionRepository(request).get();
    expect(calls[0]).toEqual({ method: 'GET', path: '/api/v1/me/subscription' });
    expect(s).toEqual(APPLE);
  });

  it('reads nulls as not subscribed', async () => {
    const { request } = fake(() => ({
      subscribed: false,
      platform: null,
      status: null,
      currentPeriodEnd: null,
      autoRenew: false,
      manage: null,
    }));
    expect((await createSubscriptionRepository(request).get()).subscribed).toBe(false);
  });

  it('asks for a billing portal link', async () => {
    const { request, calls } = fake(() => ({ url: 'https://billing.example/x' }));
    expect(await createSubscriptionRepository(request).portalUrl()).toBe('https://billing.example/x');
    expect(calls[0]).toEqual({ method: 'POST', path: '/api/v1/me/subscription/portal' });
  });

  it('reads 503 as purchases unavailable, and a portal 404 as no web subscription', async () => {
    const off = fake(() => new ApiError({ code: 'SERVICE_UNAVAILABLE', message: 'off', status: 503 }));
    await expect(createSubscriptionRepository(off.request).portalUrl()).rejects.toMatchObject({
      code: 'unavailable',
    });
    const none = fake(() => new ApiError({ code: 'NOT_FOUND', message: 'none', status: 404 }));
    await expect(createSubscriptionRepository(none.request).portalUrl()).rejects.toMatchObject({
      code: 'noWebSubscription',
    });
  });
});

describe('buying errors', () => {
  it('reads both a 503 and a 500 as purchases unavailable, try again', () => {
    const off = new ApiError({ code: 'SERVICE_UNAVAILABLE', message: 'off', status: 503 });
    const storeFailed = new ApiError({ code: 'INTERNAL', message: 'store', status: 500 });
    expect(toSubscriptionError(off, 'purchase').code).toBe('unavailable');
    expect(toSubscriptionError(storeFailed, 'purchase').code).toBe('unavailable');
    // Elsewhere a 500 is still an unexpected failure.
    expect(toSubscriptionError(storeFailed).code).toBe('unknown');
  });
});

describe('purchase endpoints (typed for when buying is built)', () => {
  it('sends each to its path', async () => {
    const { request, calls } = fake(() => ({}));
    const api = createSubscriptionApi(request);
    await api.challenge();
    await api.verifyApple({ signedTransaction: 's', challenge: 'c', keyId: 'k', attestation: 'a' });
    await api.verifyGoogle({ purchaseToken: 'p', challenge: 'c', integrityToken: 'i' });
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'GET /api/v1/me/subscription/challenge',
      'POST /api/v1/me/subscription/apple',
      'POST /api/v1/me/subscription/google',
    ]);
  });
});
