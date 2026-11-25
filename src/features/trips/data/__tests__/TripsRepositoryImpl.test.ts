import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { TripsError } from '../../domain/entities/TripsError';
import type { MyPostDto, PostCardDto } from '../dto/tripsDtos';
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

const CARD: PostCardDto = {
  id: 'p1',
  type: 'plan',
  title: 'Weekend in Accra',
  images: [{ thumbUrl: 't', cardUrl: 'https://cdn/card.jpg', fullUrl: 'f' }],
  startAt: '2026-11-18T10:00:00+00:00',
  endAt: '2026-11-20T18:00:00+00:00',
  recurrence: null,
  placeName: 'Osu, Accra',
  localityLabel: 'Accra, Ghana',
  price: null,
  goingCount: 3,
  rsvpState: 'going',
  saved: false,
};

const MINE: MyPostDto = {
  ...CARD,
  rsvpState: 'none',
  status: 'published',
  publishedAt: '2026-10-01T10:00:00Z',
  updatedAt: '2026-10-01T10:00:00Z',
};

describe('TripsRepository over the API', () => {
  it('reads the first people going to a post as faces for its card', async () => {
    const { repo, calls } = fake(() => ({
      items: [
        { user: { id: 'u1', displayName: 'Ada O.', avatarUrl: 'https://cdn/ada.jpg' }, state: 'going' },
        { user: { id: 'u2', displayName: 'Kofi A.', avatarUrl: null }, state: 'going' },
        // A row with no person in it is left out, not drawn as a blank.
        { user: null, state: 'going' },
      ],
      nextCursor: null,
      counts: { going: 3, requested: null, waitlisted: null },
    }));
    const faces = await repo.listGoingFaces('p 1', 3);
    expect(calls[0]).toEqual({ method: 'GET', path: '/api/v1/posts/p%201/attendees?state=going&limit=3' });
    expect(faces).toEqual([
      { id: 'u1', name: 'Ada O.', avatarUrl: 'https://cdn/ada.jpg' },
      { id: 'u2', name: 'Kofi A.', avatarUrl: null },
    ]);
  });

  it('lists my published posts as trip cards I host', async () => {
    const { repo, calls } = fake(() => ({ items: [MINE], nextCursor: 'c2' }));
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
          images: ['https://cdn/card.jpg'],
          price: null,
          startAt: '2026-11-18T10:00:00+00:00',
          endAt: '2026-11-20T18:00:00+00:00',
          recurrence: null,
          placeName: 'Osu, Accra',
          localityLabel: 'Accra, Ghana',
          goingCount: 3,
          status: 'published',
          role: 'hosting',
        },
      ],
    });
  });

  it('lists what I am going to, asked to join and am waitlisted on, tagged by list', async () => {
    const weekly: PostCardDto = {
      ...CARD,
      type: 'group',
      localityLabel: null,
      recurrence: { frequency: 'weekly', endsOn: null },
    };
    const { repo, calls } = fake(() => ({ items: [weekly], nextCursor: null }));
    const going = await repo.listRsvps('going', null, 20);
    const requested = await repo.listRsvps('requested', 'c3', 20);
    const waitlisted = await repo.listRsvps('waitlisted', null, 20);
    expect(calls.map((c) => c.path)).toEqual([
      '/api/v1/me/rsvps?state=going&limit=20',
      '/api/v1/me/rsvps?state=requested&cursor=c3&limit=20',
      '/api/v1/me/rsvps?state=waitlisted&limit=20',
    ]);
    expect(waitlisted.items[0]?.role).toBe('waitlisted');
    expect(going.items[0]).toMatchObject({
      role: 'going',
      recurrence: 'weekly',
      localityLabel: '',
      status: 'published',
    });
    expect(requested.items[0]?.role).toBe('requested');
  });

  it('pages what I attended by cursor, and reads them as published', async () => {
    const { repo, calls } = fake(() => ({ items: [CARD], nextCursor: null }));
    const page = await repo.listAttended('c2', 20);
    expect(calls[0]?.path).toBe('/api/v1/me/attended?cursor=c2&limit=20');
    expect(page.items[0]).toMatchObject({ status: 'published', role: 'attended' });
  });

  it('maps failures by code', async () => {
    const offline = await fake(() => new ApiError({ code: 'NETWORK', message: 'down' }))
      .repo.listHosted(null, 20)
      .catch((e: unknown) => e);
    expect(offline).toBeInstanceOf(TripsError);
    expect(offline).toMatchObject({ code: 'network' });
    const expired = await fake(() => new ApiError({ code: 'UNAUTHORIZED', message: 'no', status: 401 }))
      .repo.listRsvps('going', null, 20)
      .catch((e: unknown) => e);
    expect(expired).toMatchObject({ code: 'sessionExpired' });
  });
});
