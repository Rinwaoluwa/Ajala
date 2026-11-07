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
      endAt: '2026-10-22T23:00:00+01:00',
      recurrence: null,
      placeName: 'Eko Convention Centre, VI',
      lat: 6.42,
      lng: 3.41,
      city: { id: 'los', name: 'Lagos', countryCode: 'NG', label: 'Lagos, NG' },
      capacity: null,
      price: { amountCents: 6000000, currency: 'NGN', exponent: 2 },
      costSplit: null,
      externalUrl: 'https://tix.example/art',
      joinMode: 'external',
      goingCount: 12,
      rsvpState: 'none',
      saved: true,
      visibility: 'open',
      host: { id: 'h', displayName: 'Art Lagos', avatarUrl: null, verified: true },
      interests: [],
      distanceKm: 7.2,
    },
    {
      id: 'p2',
      type: 'plan',
      title: 'Tarkwa Bay Beach Day',
      images: [],
      startAt: '2026-10-25T09:00:00+01:00',
      endAt: null,
      recurrence: { frequency: 'weekly', endsOn: null },
      placeName: null,
      lat: null,
      lng: null,
      city: null,
      capacity: 10,
      price: null,
      costSplit: { totalCents: 4800000, currency: 'NGN', exponent: 2, expectedCount: 4, perPersonCents: 1200000 },
      externalUrl: null,
      joinMode: 'rsvp',
      goingCount: 3,
      rsvpState: 'going',
      saved: false,
      visibility: 'open',
      host: { id: 'h2', displayName: 'Tolu A.', avatarUrl: null, verified: false },
      interests: [],
      distanceKm: null,
    },
  ],
};

type Call = { method: string; path: string; body?: unknown; headers?: Record<string, string> };

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
    const page = await createFeedRepository(request).getFeed('event', 'c1', 20);

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
      endAt: '2026-10-22T23:00:00+01:00',
      joinMode: 'external',
      saved: true,
      costShare: null,
    });
    expect(page.items[1]).toMatchObject({
      saved: false,
      recurrence: 'weekly',
      rsvpState: 'going',
      costShare: { perPerson: 12000, currency: 'NGN', expectedCount: 4 },
    });
  });

  it('reads a teleported feed as such', async () => {
    const { request } = fake(() => ({ ...PAGE, citySource: 'teleport' }));
    expect((await createFeedRepository(request).getFeed('all', null, 20)).citySource).toBe('teleport');
  });

  it('teleports by city id and comes home with a DELETE', async () => {
    const { request, calls } = fake(() => undefined);
    const repo = createFeedRepository(request);
    await repo.teleport('london');
    await repo.returnHome();
    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/me/teleport', body: { cityId: 'london' } },
      { method: 'DELETE', path: '/api/v1/me/teleport' },
    ]);
  });

  it('reads a 402 on teleport as the paywall, a 404 as a city that is gone', async () => {
    const paywall = fake(() => new ApiError({ code: 'PAYMENT_REQUIRED', message: 'pay', status: 402 }));
    await expect(createFeedRepository(paywall.request).teleport('london')).rejects.toMatchObject({
      code: 'paymentRequired',
    });
    const gone = fake(() => new ApiError({ code: 'NOT_FOUND', message: 'no city', status: 404 }));
    await expect(createFeedRepository(gone.request).teleport('atlantis')).rejects.toMatchObject({
      code: 'cityNotFound',
    });
  });

  it('lists popular cities from the server', async () => {
    const { request, calls } = fake(() => [
      {
        id: 'lagos',
        name: 'Lagos',
        countryCode: 'NG',
        label: 'Lagos, Nigeria',
        region: 'Lagos',
        countryName: 'Nigeria',
        timezone: 'Africa/Lagos',
        lat: 6.5,
        lng: 3.4,
      },
    ]);
    const cities = await createFeedRepository(request).popularCities();
    expect(calls[0]?.path).toBe('/api/v1/cities/popular');
    expect(cities).toEqual([{ id: 'lagos', name: 'Lagos', countryCode: 'NG', countryName: 'Nigeria' }]);
  });

  it('leaves the cursor out of the first page', async () => {
    const { request, calls } = fake(() => PAGE);
    await createFeedRepository(request).getFeed('all', null, 20);
    expect(calls[0]?.path).toBe('/api/v1/feed?type=all&limit=20');
  });

  it('reads NO_CITY by its code', async () => {
    const { request } = fake(() => new ApiError({ code: 'NO_CITY', message: 'no city', status: 404 }));
    await expect(createFeedRepository(request).getFeed('all', null, 20)).rejects.toMatchObject({
      code: 'noCity',
    });
  });
});
