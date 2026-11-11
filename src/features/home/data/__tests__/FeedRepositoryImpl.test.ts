import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';
import { PlacesError, endPlacesSession, placeDetails, searchCities } from '@core/places';

import { createFeedRepository } from '../repositories/FeedRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getClientLocationHeader: async () => ({ 'X-Client-Location': '6.453,3.396' }),
}));

// The place search on the phone, faked: the real one calls Google (or the demo list).
jest.mock('@core/places', () => {
  const actual = jest.requireActual<typeof import('@core/places/placesTypes')>('@core/places/placesTypes');
  return {
    PlacesError: actual.PlacesError,
    isPlacesError: actual.isPlacesError,
    searchCities: jest.fn(),
    placeDetails: jest.fn(),
    endPlacesSession: jest.fn(),
  };
});

const PAGE = {
  origin: { lat: 6.453, lng: 3.396, label: null, region: 'Lagos' },
  originSource: 'device',
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
      placeId: 'g-eko',
      formattedAddress: 'Plot 1415 Adetokunbo Ademola St, Victoria Island, Lagos, Nigeria',
      localityLabel: 'Lagos, Nigeria',
      countryCode: 'NG',
      lat: 6.42,
      lng: 3.41,
      capacity: null,
      price: { amountCents: 6000000, currency: 'NGN', exponent: 2 },
      externalUrl: 'https://tix.example/art',
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
      placeId: null,
      formattedAddress: null,
      localityLabel: 'Lagos, Nigeria',
      countryCode: 'NG',
      lat: 6.43,
      lng: 3.42,
      capacity: 10,
      price: null,
      externalUrl: null,
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
    expect(page.origin).toEqual({ lat: 6.453, lng: 3.396, label: null, region: 'Lagos' });
    expect(page.originSource).toBe('device');
    expect(page.items[0]).toMatchObject({
      imageUrl: 'https://cdn/card.jpg',
      price: { amount: 60000, currency: 'NGN' },
      host: { name: 'Art Lagos' },
      endAt: '2026-10-22T23:00:00+01:00',
      saved: true,
      placeName: 'Eko Convention Centre, VI',
      placeId: 'g-eko',
      localityLabel: 'Lagos, Nigeria',
      countryCode: 'NG',
    });
    // A dropped pin has no name of its own: the card names the city around it.
    expect(page.items[1]).toMatchObject({ placeName: 'Lagos, Nigeria', placeId: null });
    expect(page.items[0]).not.toHaveProperty('city');
    expect(page.items[1]).toMatchObject({
      saved: false,
      recurrence: 'weekly',
      rsvpState: 'going',
      price: null,
    });
    // No shared cost and no join mode: every post joins by RSVP (backend answers, Nov 9).
    expect(page.items[0]).not.toHaveProperty('costShare');
    expect(page.items[0]).not.toHaveProperty('joinMode');
  });

  it('reads a teleported feed as such, with its name', async () => {
    const { request } = fake(() => ({
      ...PAGE,
      origin: { lat: 5.6, lng: -0.19, label: 'Accra, Ghana', region: 'Greater Accra' },
      originSource: 'teleport',
    }));
    const page = await createFeedRepository(request).getFeed('all', null, 20);
    expect(page.originSource).toBe('teleport');
    expect(page.origin.label).toBe('Accra, Ghana');
  });

  it('reads the teleport (a place id alone) and the home place from GET /me', async () => {
    const LAGOS = { placeId: 'g-lagos', label: 'Lagos, Nigeria', countryCode: 'NG' };
    const { request, calls } = fake(() => ({ id: 'u1', homePlace: LAGOS, teleport: { placeId: 'g-accra' } }));
    expect(await createFeedRepository(request).getTravelState()).toEqual({
      viewerId: 'u1',
      teleport: { placeId: 'g-accra' },
      homePlace: LAGOS,
    });
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/me' });
  });

  it('reads no teleport as null (none, or the subscription ended)', async () => {
    const { request } = fake(() => ({ id: 'u1', homePlace: null, teleport: null }));
    expect(await createFeedRepository(request).getTravelState()).toEqual({
      viewerId: 'u1',
      teleport: null,
      homePlace: null,
    });
  });

  it('teleports by place id and comes home with a DELETE', async () => {
    const { request, calls } = fake(() => undefined);
    const repo = createFeedRepository(request);
    await repo.teleport('g-accra');
    await repo.returnHome();
    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/me/teleport', body: { placeId: 'g-accra' } },
      { method: 'DELETE', path: '/api/v1/me/teleport' },
    ]);
  });

  it('reads teleport refusals: 402 the paywall, 400 not a city, 503 try again', async () => {
    const cases = [
      [new ApiError({ code: 'PAYMENT_REQUIRED', message: 'pay', status: 402 }), 'paymentRequired'],
      [new ApiError({ code: 'VALIDATION_FAILED', message: 'Pick a city', status: 400 }), 'notACity'],
      [new ApiError({ code: 'SERVICE_UNAVAILABLE', message: 'maps down', status: 503 }), 'unavailable'],
    ] as const;
    for (const [error, code] of cases) {
      const { request } = fake(() => error);
      await expect(createFeedRepository(request).teleport('g-somewhere')).rejects.toMatchObject({ code });
    }
  });

  it('searches cities on the phone, passing the cancel signal through', async () => {
    jest.mocked(searchCities).mockResolvedValueOnce([
      { placeId: 'g-accra', primaryText: 'Accra', secondaryText: 'Ghana' },
    ]);
    const { request, calls } = fake(() => undefined);
    const signal = new AbortController().signal;
    expect(await createFeedRepository(request).searchCities('acc', signal)).toEqual([
      { placeId: 'g-accra', name: 'Accra', detail: 'Ghana' },
    ]);
    expect(searchCities).toHaveBeenCalledWith('acc', null, signal);
    // Nothing goes to the API: it has no city search.
    expect(calls).toEqual([]);
  });

  it('reads a place search failure as "place search unavailable", and lets a cancel through', async () => {
    jest.mocked(searchCities).mockRejectedValueOnce(new PlacesError('denied', 'refused'));
    const repo = createFeedRepository(fake(() => undefined).request);
    await expect(repo.searchCities('acc')).rejects.toMatchObject({ code: 'placesUnavailable' });

    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    jest.mocked(searchCities).mockRejectedValueOnce(abort);
    await expect(repo.searchCities('acc')).rejects.toBe(abort);
  });

  it('names a place by id, and ends the search session on request', async () => {
    jest.mocked(placeDetails).mockResolvedValueOnce({
      placeId: 'g-accra',
      name: 'Accra',
      address: 'Accra, Ghana',
      lat: 5.6,
      lng: -0.19,
    });
    const repo = createFeedRepository(fake(() => undefined).request);
    expect(await repo.placeName('g-accra')).toBe('Accra');
    repo.endCitySearch();
    expect(endPlacesSession).toHaveBeenCalled();
  });

  it('leaves the cursor out of the first page', async () => {
    const { request, calls } = fake(() => PAGE);
    await createFeedRepository(request).getFeed('all', null, 20);
    expect(calls[0]?.path).toBe('/api/v1/feed?type=all&limit=20');
  });

  it('reads NO_LOCATION (no location, no teleport) by its code', async () => {
    const { request } = fake(() => new ApiError({ code: 'NO_LOCATION', message: 'no location', status: 404 }));
    await expect(createFeedRepository(request).getFeed('all', null, 20)).rejects.toMatchObject({
      code: 'noLocation',
    });
  });
});
