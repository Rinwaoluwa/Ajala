import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { TripsError } from '../../domain/entities/TripsError';
import { createTripsRepository } from '../repositories/TripsRepositoryImpl';

type Call = { method: string; path: string };

function fake(answer: () => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer();
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createTripsRepository(request), calls };
}

const ITEM = {
  id: 'p1',
  type: 'plan',
  title: 'Weekend in Accra',
  images: [{ thumbUrl: 't', cardUrl: 'https://cdn/card.jpg', fullUrl: 'f' }],
  startAt: '2026-11-18T10:00:00+00:00',
  placeName: 'Osu, Accra',
  city: { id: 'accra', name: 'Accra', countryCode: 'GH', label: 'Accra, Ghana' },
  goingCount: 3,
  status: 'published',
  publishedAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

describe('TripsRepository over the API', () => {
  it('lists my published posts as trip cards', async () => {
    const { repo, calls } = fake(() => ({ items: [ITEM], nextCursor: 'c2' }));
    const page = await repo.listHosted(null, 20);
    expect(calls[0]).toEqual({ method: 'GET', path: '/api/v1/me/posts?status=published&limit=20' });
    expect(page).toEqual({
      nextCursor: 'c2',
      items: [
        {
          id: 'p1',
          type: 'plan',
          title: 'Weekend in Accra',
          imageUrl: 'https://cdn/card.jpg',
          startAt: '2026-11-18T10:00:00+00:00',
          placeName: 'Osu, Accra',
          cityLabel: 'Accra, Ghana',
          goingCount: 3,
          status: 'published',
        },
      ],
    });
  });

  it('pages what I attended by cursor, and reads them as published', async () => {
    const { status: _status, publishedAt: _p, updatedAt: _u, ...card } = ITEM;
    const { repo, calls } = fake(() => ({ items: [card], nextCursor: null }));
    const page = await repo.listAttended('c2', 20);
    expect(calls[0]?.path).toBe('/api/v1/me/attended?cursor=c2&limit=20');
    expect(page.items[0]?.status).toBe('published');
  });

  it('maps failures by code', async () => {
    const offline = await fake(() => new ApiError({ code: 'NETWORK', message: 'down' }))
      .repo.listHosted(null, 20)
      .catch((e: unknown) => e);
    expect(offline).toBeInstanceOf(TripsError);
    expect(offline).toMatchObject({ code: 'network' });
    const expired = await fake(() => new ApiError({ code: 'UNAUTHORIZED', message: 'no', status: 401 }))
      .repo.listAttended(null, 20)
      .catch((e: unknown) => e);
    expect(expired).toMatchObject({ code: 'sessionExpired' });
  });
});
