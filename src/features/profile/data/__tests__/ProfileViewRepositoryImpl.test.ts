import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createProfileViewRepository } from '../repositories/ProfileViewRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getClientLocationHeader: async () => ({ 'X-Client-Location': '6.453,3.396' }),
}));

type Call = {
  method: string;
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
};

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createProfileViewRepository(request), calls };
}

const PERSON = {
  id: 'u1',
  handle: 'liamexplores',
  displayName: 'Liam T.',
  avatarUrl: null,
  bio: 'Architect by day',
  photos: [
    { id: 'p2', url: 'u2', thumbUrl: 't2', position: 1 },
    { id: 'p1', url: 'u1', thumbUrl: 't1', position: 0 },
  ],
  gender: null,
  homeCity: {
    id: 'bcn',
    name: 'Barcelona',
    countryCode: 'ES',
    label: 'Barcelona, Spain',
  },
  visiting: {
    city: {
      id: 'lis',
      name: 'Lisbon',
      countryCode: 'PT',
      label: 'Lisbon, Portugal',
    },
  },
  verified: true,
  interests: [{ id: 'i', slug: 'surfing', name: 'Surfing', emoji: null }],
  extras: { pronouns: 'he/him', travelStyles: ['surfing', 'city_break'] },
  favouriteCities: [{ id: 'lis', name: 'Lisbon', countryCode: 'PT', label: 'Lisbon, Portugal' }],
  openToMeetToday: true,
  sharePlans: true,
  memberSince: '2025-01-01T00:00:00Z',
  blockedByMe: false,
};

const CARD = {
  id: 'p',
  type: 'plan',
  title: 'A weekend in Barcelona',
  images: [{ thumbUrl: 't', cardUrl: 'card.jpg', fullUrl: 'f' }],
  startAt: '2026-10-24T10:00:00+02:00',
  placeName: 'El Born',
  city: PERSON.homeCity,
  capacity: 10,
  goingCount: 3,
  saved: true,
  host: { id: 'u1', displayName: 'Liam T.', avatarUrl: null, verified: true },
  interests: null,
  distanceKm: 1.2,
};

describe('ProfileViewRepository over the API', () => {
  it('reads a person, photos in their order', async () => {
    const { repo, calls } = fake(() => PERSON);
    const person = await repo.getPerson('u1');
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/users/u1' });
    expect(person).toMatchObject({ displayName: 'Liam T.', about: { pronouns: 'he/him', verified: true } });
    expect(person.about.photos.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(person).toMatchObject({
      travelStyles: ['surfing', 'city_break'],
      favouriteCities: [{ id: 'lis' }],
      visiting: { id: 'lis' },
      openToMeetToday: true,
      sharePlans: true,
    });
  });

  it('pages saved posts by type, Going / Requested, and their plans', async () => {
    const { repo, calls } = fake(() => ({ items: [CARD], nextCursor: null }));
    const saved = await repo.getMySaved('event', null, 20);
    await repo.getMyRsvps('requested', '20', 20);
    await repo.getPersonPlans('u1', null, 20);
    expect(calls.map((c) => c.path)).toEqual([
      '/api/v1/me/saved?type=event&limit=20',
      '/api/v1/me/rsvps?state=requested&cursor=20&limit=20',
      '/api/v1/users/u1/plans?limit=20',
    ]);
    expect(saved.items[0]).toMatchObject({
      saved: true,
      host: { name: 'Liam T.' },
      distanceKm: 1.2,
    });
  });

  it('keeps a card with no city', async () => {
    const { repo } = fake(() => ({
      items: [{ ...CARD, city: null }],
      nextCursor: null,
    }));
    expect((await repo.getMyAttended(null, 20)).items[0]?.city).toBeNull();
  });

  it('pages their posts with the location header', async () => {
    const { repo, calls } = fake(() => ({ items: [CARD], nextCursor: '20' }));
    const page = await repo.getPersonPosts('u1', null, 20);
    expect(calls[0]?.path).toBe('/api/v1/users/u1/posts?limit=20');
    expect(calls[0]?.headers).toEqual({ 'X-Client-Location': '6.453,3.396' });
    expect(page.items[0]).toMatchObject({
      title: 'A weekend in Barcelona',
      imageUrl: 'card.jpg',
      photoCount: 1,
    });
    expect(page.nextCursor).toBe('20');
  });

  it('says a hidden profile is not available, and a second report is already open', async () => {
    const notFound = await fake(() => new ApiError({ code: 'NOT_FOUND', message: 'x', status: 404 }))
      .repo.getPerson('u9')
      .catch((e: unknown) => e);
    expect(notFound).toMatchObject({ code: 'notFound' });

    const twice = await fake(() => new ApiError({ code: 'CONFLICT', message: 'x', status: 409 }))
      .repo.report('u1', 'spam', null)
      .catch((e: unknown) => e);
    expect(twice).toMatchObject({ code: 'alreadyReported' });
  });

  it('blocks, unblocks and reports with the documented calls', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.block('u1');
    await repo.unblock('u1');
    await repo.report('u1', 'other', 'Asked for money');
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/users/u1/block',
      'DELETE /api/v1/users/u1/block',
      'POST /api/v1/users/u1/report',
    ]);
    expect(calls[2]?.body).toEqual({ reason: 'other', details: 'Asked for money' });
  });
});
