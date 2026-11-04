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
  city: { id: 'osun', name: 'Osogbo', label: 'Osogbo, NG' },
  capacity: 12,
  price: { amountCents: 1500, currency: 'USD', exponent: 2 },
  externalUrl: null,
  joinMode: 'rsvp',
  goingCount: 8,
  rsvpState: 'none',
  visibility: 'open',
  waitlistEnabled: false,
  waitlistPosition: null,
  status: 'published',
  isHost: false,
  host: { id: 'h1', displayName: 'Fatima B.', avatarUrl: null, verified: true },
};

describe('PostDetailRepository over the API', () => {
  it('reads the post with the location header and maps it', async () => {
    const { repo, calls } = fake(() => DETAIL);
    const post = await repo.getPost('p1');
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/posts/p1' });
    expect(calls[0]?.headers).toEqual({ 'X-Client-Location': '6.453,3.396' });
    expect(post).toMatchObject({
      images: ['https://cdn/full.jpg'],
      price: { amount: 15, currency: 'USD' },
      host: { id: 'h1', name: 'Fatima B.' },
    });
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
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/posts/p1/rsvp',
      'DELETE /api/v1/posts/p1/rsvp',
      'POST /api/v1/posts/p1/attendees/u2/accept',
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
