import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createFeedRepository } from '../repositories/FeedRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getClientLocationHeader: async () => ({ 'X-Client-Location': '6.453,3.396' }),
}));

const PAGE = {
  city: { id: 'los', name: 'Lagos', countryCode: 'NG', label: 'Lagos, NG' },
  citySource: 'device',
  nextCursor: 'c2',
  items: [
    {
      id: 'p1',
      type: 'event',
      title: 'Art Lagos 2026 - Opening Night',
      images: [{ thumbUrl: 't', cardUrl: 'https://cdn/card.jpg', fullUrl: 'f' }],
      startAt: '2026-10-22T18:00:00+01:00',
      placeName: 'Eko Convention Centre, VI',
      capacity: null,
      price: { amountCents: 6000000, currency: 'NGN', exponent: 2 },
      goingCount: 12,
      host: { id: 'h', displayName: 'Art Lagos', avatarUrl: null, verified: true },
      distanceKm: 7.2,
    },
  ],
};

type Call = { method: string; path: string; headers?: Record<string, string> };

function fake(answer: () => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer();
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { request, calls };
}

describe('feed repository', () => {
  it('asks for a page with the type, cursor and location header', async () => {
    const { request, calls } = fake(() => PAGE);
    const page = await createFeedRepository(request).getFeed('event', 'c1', 20, null);

    expect(calls[0]).toEqual({
      method: 'GET',
      path: '/api/v1/feed?type=event&cursor=c1&limit=20',
      headers: { 'X-Client-Location': '6.453,3.396' },
    });
    expect(page.city.name).toBe('Lagos');
    expect(page.items[0]).toMatchObject({
      imageUrl: 'https://cdn/card.jpg',
      price: { amount: 60000, currency: 'NGN' },
      host: { name: 'Art Lagos' },
    });
  });

  it('leaves the cursor out of the first page', async () => {
    const { request, calls } = fake(() => PAGE);
    await createFeedRepository(request).getFeed('all', null, 20, null);
    expect(calls[0]?.path).toBe('/api/v1/feed?type=all&limit=20');
  });

  it('reads NO_CITY by its code', async () => {
    const { request } = fake(() => new ApiError({ code: 'NO_CITY', message: 'no city', status: 404 }));
    await expect(createFeedRepository(request).getFeed('all', null, 20, null)).rejects.toMatchObject({
      code: 'noCity',
    });
  });
});
