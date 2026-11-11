import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';
import { PlacesError, endPlacesSession, placeDetails, searchCities } from '@core/places';

import { createExploreRepository } from '../repositories/ExploreRepositoryImpl';

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
  endAt: null,
  recurrence: null,
  placeName: 'The Nest',
  placeId: 'g-nest',
  formattedAddress: '1 Admiralty Way, Lekki, Lagos, Nigeria',
  localityLabel: 'Lagos, Nigeria',
  countryCode: 'NG',
  lat: 6.43,
  lng: 3.42,
  capacity: 60,
  price: null,
  externalUrl: null,
  goingCount: 47,
  rsvpState: 'none',
  saved: false,
  visibility: 'open',
  host: { id: 'h', displayName: 'Ada O.', avatarUrl: null, verified: false },
  interests: [],
  distanceKm: 1.2,
  isHost: false,
  waitlistPosition: null,
};

const LISTED = {
  id: 'p1',
  type: 'meetup',
  title: 'Lagos Tech Founders Networking',
  imageUrl: 'https://cdn/card.jpg',
  startAt: '2026-10-04T18:00:00+01:00',
  placeName: 'The Nest',
  placeId: 'g-nest',
  formattedAddress: '1 Admiralty Way, Lekki, Lagos, Nigeria',
  localityLabel: 'Lagos, Nigeria',
  countryCode: 'NG',
  goingCount: 47,
  distanceKm: 1.2,
};

const ORIGIN = { lat: 6.453, lng: 3.396, label: null, region: 'Lagos' };

describe('explore repository', () => {
  it('asks for pins in a box of one type, with the location header', async () => {
    const { request, calls } = fake(() => ({
      origin: ORIGIN,
      originSource: 'device',
      reach: 'radius',
      pins: [
        { id: 'p1', type: 'event', lat: 6.4, lng: 3.4, title: 'Afrobeats', startAt: '2026-10-30T19:00:00Z' },
      ],
    }));
    const result = await createExploreRepository(request, notice).getPins(
      { west: 3.3, south: 6.4, east: 3.5, north: 6.6 },
      'event',
      null,
    );
    expect(calls[0]).toEqual({
      method: 'GET',
      path: '/api/v1/map/pins?bbox=3.3%2C6.4%2C3.5%2C6.6&type=event',
      headers: { 'X-Client-Location': '6.453,3.396' },
    });
    expect(result).toEqual({
      origin: ORIGIN,
      originSource: 'device',
      reach: 'radius',
      pins: [
        { id: 'p1', type: 'event', lat: 6.4, lng: 3.4, title: 'Afrobeats', startAt: '2026-10-30T19:00:00Z' },
      ],
    });
  });

  it('leaves the type out for all pins', async () => {
    const { request, calls } = fake(() => ({ origin: ORIGIN, originSource: 'device', reach: 'box', pins: [] }));
    await createExploreRepository(request, notice).getPins({ west: 1, south: 2, east: 3, north: 4 }, null, null);
    expect(calls[0].path).toBe('/api/v1/map/pins?bbox=1%2C2%2C3%2C4');
  });

  it('sends a title filter as q', async () => {
    const { request, calls } = fake(() => ({ origin: ORIGIN, originSource: 'device', reach: 'box', pins: [] }));
    await createExploreRepository(request, notice).getPins({ west: 1, south: 2, east: 3, north: 4 }, null, 'jazz');
    expect(calls[0].path).toBe('/api/v1/map/pins?bbox=1%2C2%2C3%2C4&q=jazz');
  });

  it('maps a post for its mini card', async () => {
    const { request, calls } = fake(() => POST);
    const post = await createExploreRepository(request, notice).getPost('p1');
    expect(calls[0].path).toBe('/api/v1/posts/p1');
    expect(post).toMatchObject({
      id: 'p1',
      imageUrl: 'https://cdn/card.jpg',
      placeName: 'The Nest',
      placeId: 'g-nest',
      localityLabel: 'Lagos, Nigeria',
      countryCode: 'NG',
      goingCount: 47,
      capacity: 60,
      rsvpState: 'none',
      externalUrl: null,
      isHost: false,
      hostId: 'h',
    });
    // Shared cost is gone from the API: nothing of it reaches the card.
    expect(post).not.toHaveProperty('costShare');
  });

  it("keeps a post's link: joining opens it as well as RSVPing", async () => {
    const { request } = fake(() => ({
      ...POST,
      type: 'event',
      externalUrl: 'https://tix.africa/x',
    }));
    const post = await createExploreRepository(request, notice).getPost('p1');
    expect(post.externalUrl).toBe('https://tix.africa/x');
  });

  it('counts a link click with a POST, and reads who is signed in', async () => {
    const { request, calls } = fake((c) => (c.path === '/api/v1/me' ? { id: 'me-1' } : undefined));
    const repo = createExploreRepository(request, notice);
    await repo.recordLinkClick('p1');
    expect((await repo.getMe()).id).toBe('me-1');
    expect(calls.map((c) => [c.method, c.path])).toEqual([
      ['POST', '/api/v1/posts/p1/link-click'],
      ['GET', '/api/v1/me'],
    ]);
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

  it('reads a paused reporter by its code, and a plain 409 elsewhere as a conflict', async () => {
    const paused = fake(() => new ApiError({ code: 'REPORTING_PAUSED', message: 'paused', status: 403 }));
    await expect(
      createExploreRepository(paused.request, notice).report('p1', 'other', 'x'),
    ).rejects.toMatchObject({ code: 'reportingPaused' });
    const changed = fake(() => new ApiError({ code: 'CONFLICT', message: 'not live', status: 409 }));
    await expect(createExploreRepository(changed.request, notice).rsvp('p1')).rejects.toMatchObject({
      code: 'conflict',
    });
  });

  it('names a dropped pin by the city around it', async () => {
    const { request } = fake(() => ({ ...POST, placeName: null, placeId: null, formattedAddress: null }));
    expect((await createExploreRepository(request, notice).getPost('p1')).placeName).toBe('Lagos, Nigeria');
  });

  it('reads NO_LOCATION (no location, no teleport) by its code', async () => {
    const { request } = fake(() => new ApiError({ code: 'NO_LOCATION', message: 'no location', status: 404 }));
    await expect(
      createExploreRepository(request, notice).getPins({ west: 1, south: 2, east: 3, north: 4 }, null, null),
    ).rejects.toMatchObject({ code: 'noLocation' });
  });

  it('reads a 409 on a report as already reported, a 400 as their own post', async () => {
    const conflict = fake(() => new ApiError({ code: 'CONFLICT', message: 'open', status: 409 }));
    await expect(
      createExploreRepository(conflict.request, notice).report('p1', 'other', 'x'),
    ).rejects.toMatchObject({
      code: 'alreadyReported',
    });
    // Swagger answers both with VALIDATION_FAILED; only missing words name a field.
    const own = fake(() => new ApiError({ code: 'VALIDATION_FAILED', message: 'own', status: 400 }));
    await expect(
      createExploreRepository(own.request, notice).report('p1', 'other', 'x'),
    ).rejects.toMatchObject({
      code: 'ownPost',
    });
    const empty = fake(
      () =>
        new ApiError({
          code: 'VALIDATION_FAILED',
          message: 'details',
          status: 400,
          fieldErrors: [{ field: 'details', message: 'required' }],
        }),
    );
    await expect(
      createExploreRepository(empty.request, notice).report('p1', 'other', ''),
    ).rejects.toMatchObject({ code: 'detailsRequired' });
  });

  it('reads the feed of one type', async () => {
    const { request, calls } = fake(() => ({
      items: [POST],
      nextCursor: 'c2',
      origin: { ...ORIGIN, label: 'Accra, Ghana' },
      originSource: 'teleport',
    }));
    const page = await createExploreRepository(request, notice).getFeed('meetup', null, 20);
    expect(calls[0]).toEqual({
      method: 'GET',
      path: '/api/v1/feed?type=meetup&limit=20',
      headers: { 'X-Client-Location': '6.453,3.396' },
    });
    expect(page).toEqual({ items: [LISTED], nextCursor: 'c2' });
  });

  it('searches posts by words, or by interests repeated once each', async () => {
    const { request, calls } = fake(() => ({ items: [POST], nextCursor: null }));
    const repo = createExploreRepository(request, notice);
    await repo.searchPosts({ words: 'jazz night', interestIds: [], type: null }, null, 20);
    await repo.searchPosts({ words: null, interestIds: ['i1', 'i2'], type: 'meetup' }, 'c1', 20);
    expect(calls[0]?.path).toBe('/api/v1/search/posts?q=jazz%20night&limit=20');
    expect(calls[1]?.path).toBe(
      '/api/v1/search/posts?interestIds=i1&interestIds=i2&type=meetup&cursor=c1&limit=20',
    );
  });

  it('finds cities on the phone, and where one is when chosen', async () => {
    jest.mocked(searchCities).mockResolvedValueOnce([
      { placeId: 'g-lagos', primaryText: 'Lagos', secondaryText: 'Nigeria' },
    ]);
    jest.mocked(placeDetails).mockResolvedValueOnce({
      placeId: 'g-lagos',
      name: 'Lagos',
      address: 'Lagos, Nigeria',
      lat: 6.5,
      lng: 3.4,
    });
    const { request, calls } = fake(() => null);
    const repo = createExploreRepository(request, notice);
    const signal = new AbortController().signal;
    expect(await repo.searchPlaces('lag', signal)).toEqual([{ placeId: 'g-lagos', name: 'Lagos', detail: 'Nigeria' }]);
    expect(searchCities).toHaveBeenCalledWith('lag', null, signal);
    expect(await repo.placeLocation('g-lagos')).toEqual({ lat: 6.5, lng: 3.4 });
    repo.endPlaceSearch();
    expect(endPlacesSession).toHaveBeenCalled();
    // The API has no city search any more: nothing goes to it.
    expect(calls).toEqual([]);
  });

  it('reads a place search failure as "place search unavailable"', async () => {
    jest.mocked(searchCities).mockRejectedValueOnce(new PlacesError('network', 'offline'));
    await expect(
      createExploreRepository(fake(() => null).request, notice).searchPlaces('lag'),
    ).rejects.toMatchObject({ code: 'placesUnavailable' });
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

describe('pins by interest', () => {
  const page = (items: unknown[], nextCursor: string | null) => ({
    items,
    nextCursor,
    origin: { lat: 6.45, lng: 3.4, label: null, region: 'Lagos' },
    originSource: 'device',
  });

  it('searches posts with the interest, pages on, and places only posts that have a point', async () => {
    const { request, calls } = fake((call) =>
      call.path.includes('cursor=c2')
        ? page([{ ...POST, id: 'p3', lat: 6.5, lng: 3.5 }], null)
        : page([{ ...POST, id: 'p1', lat: 6.46, lng: 3.41 }, { ...POST, id: 'p2', lat: null, lng: null }], 'c2'),
    );
    const result = await createExploreRepository(request, notice).getPinsByInterest('i1', 'meetup');
    expect(calls.map((c) => c.path)).toEqual([
      '/api/v1/search/posts?interestIds=i1&type=meetup&limit=50',
      '/api/v1/search/posts?interestIds=i1&type=meetup&cursor=c2&limit=50',
    ]);
    expect(calls[0]?.headers).toEqual({ 'X-Client-Location': '6.453,3.396' });
    expect(result.reach).toBe('radius');
    expect(result.origin.region).toBe('Lagos');
    expect(result.pins.map((p) => p.id)).toEqual(['p1', 'p3']);
  });

  it('reads the person with their interests', async () => {
    const { request } = fake(() => ({ id: 'me', interests: [{ id: 'i1', slug: 'hiking', name: 'Hiking', emoji: null }] }));
    const me = await createExploreRepository(request, notice).getMe();
    expect(me).toEqual({ id: 'me', interests: [{ id: 'i1', name: 'Hiking', emoji: null }] });
  });
});
