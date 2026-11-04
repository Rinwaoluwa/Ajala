import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createExploreRepository } from '../repositories/ExploreRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getClientLocationHeader: async () => ({ 'X-Client-Location': '6.453,3.396' }),
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: async (k: string) => store.get(k) ?? null,
      setItem: async (k: string, v: string) => void store.set(k, v),
    },
  };
});

type Call = { method: string; path: string; body?: unknown; headers?: Record<string, string> };

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

const notice = (() => {
  let seen = false;
  return { seen: async () => seen, markSeen: async () => void (seen = true) };
})();

const POST = {
  id: 'p1',
  type: 'meetup',
  title: 'Lagos Tech Founders Networking',
  images: [{ thumbUrl: 't', cardUrl: 'https://cdn/card.jpg', fullUrl: 'f' }],
  startAt: '2026-10-04T18:00:00+01:00',
  placeName: 'The Nest',
  capacity: 60,
  price: null,
  externalUrl: null,
  joinMode: 'rsvp',
  goingCount: 47,
  rsvpState: 'none',
  visibility: 'open',
  distanceKm: 1.2,
  isHost: false,
  waitlistPosition: null,
};

describe('explore repository', () => {
  it('asks for pins in a box of one type, with the location header', async () => {
    const { request, calls } = fake(() => ({
      city: { id: 'los', name: 'Lagos', countryCode: 'NG', label: 'Lagos, NG' },
      citySource: 'device',
      pins: [
        { id: 'p1', type: 'event', lat: 6.4, lng: 3.4, title: 'Afrobeats', startAt: '2026-10-30T19:00:00Z' },
      ],
    }));
    const result = await createExploreRepository(request, notice).getPins(
      { west: 3.3, south: 6.4, east: 3.5, north: 6.6 },
      'event',
    );
    expect(calls[0]).toEqual({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=3.3%2C6.4%2C3.5%2C6.6&type=event',
      headers: { 'X-Client-Location': '6.453,3.396' },
    });
    expect(result).toEqual({
      cityName: 'Lagos',
      pins: [
        { id: 'p1', type: 'event', lat: 6.4, lng: 3.4, title: 'Afrobeats', startAt: '2026-10-30T19:00:00Z' },
      ],
    });
  });

  it('leaves the type out for all pins', async () => {
    const { request, calls } = fake(() => ({ city: { name: 'Lagos' }, pins: [] }));
    await createExploreRepository(request, notice).getPins({ west: 1, south: 2, east: 3, north: 4 }, null);
    expect(calls[0].path).toBe('/api/v1/map/pins?bbox=1%2C2%2C3%2C4');
  });

  it('maps a post for its mini card', async () => {
    const { request, calls } = fake(() => POST);
    const post = await createExploreRepository(request, notice).getPost('p1');
    expect(calls[0].path).toBe('/api/v1/posts/p1');
    expect(post).toMatchObject({
      id: 'p1',
      imageUrl: 'https://cdn/card.jpg',
      goingCount: 47,
      capacity: 60,
      rsvpState: 'none',
      joinMode: 'rsvp',
      isHost: false,
    });
  });

  it('joins with a POST and reads the new state', async () => {
    const { request, calls } = fake(() => ({
      state: 'going',
      goingCount: 48,
      capacity: 60,
      waitlistPosition: null,
    }));
    const result = await createExploreRepository(request, notice).rsvp('p1');
    expect(calls[0]).toEqual({ method: 'POST', path: '/api/v1/posts/p1/rsvp' });
    expect(result.state).toBe('going');
  });

  it('turns RSVP refusals into their reasons', async () => {
    const { request } = fake(() => new ApiError({ code: 'POST_FULL', message: 'full', status: 409 }));
    await expect(createExploreRepository(request, notice).rsvp('p1')).rejects.toMatchObject({
      code: 'postFull',
    });
  });

  it('reports with one reason and the details', async () => {
    const { request, calls } = fake(() => ({ id: 'r1' }));
    await createExploreRepository(request, notice).report('p1', 'spam', 'Reasons: Spam.\n\nAds');
    expect(calls[0]).toEqual({
      method: 'POST',
      path: '/api/v1/posts/p1/report',
      body: { reason: 'spam', details: 'Reasons: Spam.\n\nAds' },
    });
  });

  it('reads a 409 on a report as already reported, a 400 as their own post', async () => {
    const conflict = fake(() => new ApiError({ code: 'CONFLICT', message: 'open', status: 409 }));
    await expect(
      createExploreRepository(conflict.request, notice).report('p1', 'other', 'x'),
    ).rejects.toMatchObject({
      code: 'alreadyReported',
    });
    const own = fake(() => new ApiError({ code: 'BAD_REQUEST', message: 'own', status: 400 }));
    await expect(
      createExploreRepository(own.request, notice).report('p1', 'other', 'x'),
    ).rejects.toMatchObject({
      code: 'ownPost',
    });
  });

  it('pages meetups by interest', async () => {
    const { request, calls } = fake(() => ({ items: [POST], nextCursor: 'c2' }));
    const page = await createExploreRepository(request, notice).getMeetups('i1', 'c1', 20);
    expect(calls[0].path).toBe('/api/v1/explore/meetups?interestId=i1&cursor=c1&limit=20');
    expect(page).toEqual({
      items: [
        {
          id: 'p1',
          title: 'Lagos Tech Founders Networking',
          imageUrl: 'https://cdn/card.jpg',
          startAt: '2026-10-04T18:00:00+01:00',
          placeName: 'The Nest',
          goingCount: 47,
          distanceKm: 1.2,
        },
      ],
      nextCursor: 'c2',
    });
  });

  it('finds cities with where to move the map', async () => {
    const { request, calls } = fake(() => [
      {
        id: 'los',
        name: 'Lagos',
        countryCode: 'NG',
        label: 'Lagos, Nigeria',
        region: '',
        countryName: 'Nigeria',
        lat: 6.5,
        lng: 3.4,
      },
    ]);
    const places = await createExploreRepository(request, notice).searchPlaces('lag', 6);
    expect(calls[0].path).toBe('/api/v1/cities?q=lag&limit=6');
    expect(places).toEqual([{ id: 'los', label: 'Lagos, Nigeria', lat: 6.5, lng: 3.4 }]);
  });

  it('remembers the RSVP notice once read', async () => {
    const repo = createExploreRepository(fake(() => null).request, notice);
    expect(await repo.hasSeenRsvpNotice()).toBe(false);
    await repo.markRsvpNoticeSeen();
    expect(await repo.hasSeenRsvpNotice()).toBe(true);
  });

  it('reports no connection as network', async () => {
    const { request } = fake(() => new ApiError({ code: 'NETWORK', message: 'offline' }));
    await expect(createExploreRepository(request, notice).listInterests()).rejects.toMatchObject({
      code: 'network',
    });
  });
});
