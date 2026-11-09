import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createPostDetailRepository } from '../repositories/PostDetailRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getClientLocationHeader: async () => ({ 'X-Client-Location': '6.453,3.396' }),
}));

type Call = { method: string; path: string; headers?: Record<string, string> };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createPostDetailRepository(request), calls };
}

const DETAIL = {
  id: 'p1',
  type: 'plan',
  title: 'Weekend Hike',
  description: 'A 3-hour guided hike.',
  images: [{ thumbUrl: 't', cardUrl: 'c', fullUrl: 'https://cdn/full.jpg' }],
  startAt: '2026-10-25T06:30:00+01:00',
  placeName: 'Erin-Ijesha',
  lat: 7.6,
  lng: 4.9,
  placeId: 'g-erin-ijesha',
  formattedAddress: 'Erin-Ijesha Waterfalls, Osun, Nigeria',
  localityLabel: 'Osogbo, Nigeria',
  countryCode: 'NG',
  capacity: 12,
  // Plans carry no money; the event below has the price.
  price: null,
  externalUrl: null,
  goingCount: 8,
  rsvpState: 'none',
  visibility: 'open',
  waitlistEnabled: false,
  waitlistPosition: null,
  status: 'published',
  isHost: false,
  host: { id: 'h1', displayName: 'Fatima B.', avatarUrl: null, verified: true },
  endAt: '2026-10-25T09:30:00+01:00',
  recurrence: null,
  saved: true,
  interests: [{ id: 'i1', slug: 'hiking', name: 'Hiking', emoji: '🥾' }],
  schedule: ['Should not show on a Plan'],
  itinerary: ['Meet at the gate', 'Waterfall', 'Lunch'],
  linkClickCount: 7,
};

describe('PostDetailRepository over the API', () => {
  it('reads the post with the location header and maps it', async () => {
    const { repo, calls } = fake(() => ({
      ...DETAIL,
      type: 'event',
      price: { amountCents: 1500, currency: 'USD', exponent: 2 },
    }));
    const post = await repo.getPost('p1');
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/posts/p1' });
    expect(calls[0]?.headers).toEqual({ 'X-Client-Location': '6.453,3.396' });
    expect(post).toMatchObject({
      images: ['https://cdn/full.jpg'],
      price: { amount: 15, currency: 'USD' },
      host: { id: 'h1', name: 'Fatima B.' },
    });
  });

  it('maps the new detail fields: end, save, interests, itinerary', async () => {
    const post = await fake(() => DETAIL).repo.getPost('p1');
    expect(post).toMatchObject({
      endAt: '2026-10-25T09:30:00+01:00',
      price: null,
      saved: true,
      interests: [{ id: 'i1', name: 'Hiking', emoji: '🥾' }],
      itinerary: ['Meet at the gate', 'Waterfall', 'Lunch'],
      // A Plan has no running order, and link clicks are the host's only.
      schedule: [],
      linkClickCount: null,
    });
    // The place fields replaced the city (Swagger, 9 Nov 2026).
    expect(post).toMatchObject({
      placeName: 'Erin-Ijesha',
      placeId: 'g-erin-ijesha',
      formattedAddress: 'Erin-Ijesha Waterfalls, Osun, Nigeria',
      localityLabel: 'Osogbo, Nigeria',
      countryCode: 'NG',
    });
    expect(post).not.toHaveProperty('cityLabel');
    // Shared cost is gone from the API: nothing of it reaches the page.
    expect(post).not.toHaveProperty('costSplit');
    const mine = await fake(() => ({ ...DETAIL, isHost: true })).repo.getPost('p1');
    expect(mine.linkClickCount).toBe(7);
  });

  it('never shows a price on a Plan, even if one slips through', async () => {
    const post = await fake(() => ({
      ...DETAIL,
      price: { amountCents: 1500, currency: 'USD', exponent: 2 },
    })).repo.getPost('p1');
    expect(post.price).toBeNull();
  });

  it('reads joining your own post (409) as not allowed', async () => {
    const { repo } = fake(() => new ApiError({ status: 409, code: 'CONFLICT', message: 'Own post' }));
    await expect(repo.join('p1')).rejects.toMatchObject({ code: 'notAllowed' });
  });

  it('counts a link click, and reads the viewer with their id', async () => {
    const { repo, calls } = fake((c) =>
      c.path === '/api/v1/me'
        ? { id: 'me-1', firstName: 'Ada', lastName: 'Obi', avatarUrl: null }
        : undefined,
    );
    await repo.recordLinkClick('p1');
    expect(await repo.getViewer()).toEqual({
      id: 'me-1',
      name: 'Ada Obi',
      avatarUrl: null,
    });
    expect(calls.map((c) => [c.method, c.path])).toEqual([
      ['POST', '/api/v1/posts/p1/link-click'],
      ['GET', '/api/v1/me'],
    ]);
  });

  it('pages attendees by state', async () => {
    const { repo, calls } = fake(() => ({
      items: [
        {
          user: { id: 'u1', displayName: 'Ngozi O.', avatarUrl: null, verified: false },
          state: 'going',
          since: 'x',
          position: null,
        },
      ],
      nextCursor: '20',
      counts: { going: 8, requested: null, waitlisted: null },
    }));
    const page = await repo.getAttendees('p1', 'going', null, 20);
    expect(calls[0]?.path).toBe('/api/v1/posts/p1/attendees?state=going&limit=20');
    expect(page.items[0]).toMatchObject({ userId: 'u1', name: 'Ngozi O.', state: 'going' });
    expect(page.counts.going).toBe(8);
  });

  it('joins, leaves and answers requests on the documented paths', async () => {
    const { repo, calls } = fake(() => ({
      state: 'going',
      goingCount: 9,
      capacity: 12,
      waitlistPosition: null,
    }));
    expect(await repo.join('p1')).toMatchObject({ state: 'going', goingCount: 9 });
    await repo.leave('p1');
    await repo.accept('p1', 'u2');
    await repo.removeAttendee('p1', 'u3');
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/posts/p1/rsvp',
      'DELETE /api/v1/posts/p1/rsvp',
      'POST /api/v1/posts/p1/attendees/u2/accept',
      'POST /api/v1/posts/p1/attendees/u3/remove',
    ]);
  });

  it('maps the 409s by code', async () => {
    const full = new ApiError({ code: 'POST_FULL', message: 'full', status: 409 });
    await expect(fake(() => full).repo.join('p1')).rejects.toMatchObject({ code: 'postFull' });
    const busy = new ApiError({ code: 'POST_HAS_ATTENDEES', message: 'x', status: 409 });
    await expect(fake(() => busy).repo.remove('p1')).rejects.toMatchObject({ code: 'hasAttendees' });
    const gone = new ApiError({ code: 'NOT_FOUND', message: 'x', status: 404 });
    await expect(fake(() => gone).repo.getPost('p1')).rejects.toMatchObject({ code: 'notFound' });
  });
});
