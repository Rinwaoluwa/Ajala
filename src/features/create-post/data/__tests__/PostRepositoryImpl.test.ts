import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { CreatePostError } from '../../domain/entities/CreatePostError';
import type { PostSubmission } from '../../domain/entities/PostDraft';
import { toPostForm } from '../datasources/remote/postApi';
import { createPostRepository } from '../repositories/PostRepositoryImpl';

type Call = { method: string; path: string; body?: unknown };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createPostRepository(request), calls };
}

const submission: PostSubmission = {
  type: 'meetup',
  title: 'Coffee & Chat',
  startAt: '2026-10-22T18:00:00+01:00',
  lat: 6.44,
  lng: 3.47,
  placeName: 'The Nest',
  priceCents: 1_500_000,
  currency: 'NGN',
  waitlistEnabled: false,
  visibility: 'open',
  showOnMap: true,
  interestIds: ['food', 'music'],
  photos: [
    { key: 'a', uri: 'file:///a.jpg', name: 'a.jpg', type: 'image/jpeg' },
    { key: 'b', uri: 'file:///b.jpg', name: 'b.jpg', type: 'image/jpeg' },
  ],
};

/** FormData's entries as [name, value] pairs: React Native keeps them in `_parts`, the test DOM in `entries()`. */
function entries(form: FormData): [string, unknown][] {
  const parts = (form as unknown as { _parts?: [string, unknown][] })._parts;
  return parts ?? Array.from((form as unknown as { entries: () => Iterable<[string, unknown]> }).entries());
}

describe('the multipart form', () => {
  it('repeats lists, writes booleans as text and puts the photos last', () => {
    const form = toPostForm(
      { type: 'meetup', title: 'T', interestIds: ['a', 'b'], showOnMap: false, status: 'published' },
      [
        { uri: 'u1', name: '1.jpg', type: 'image/jpeg' },
        { uri: 'u2', name: '2.jpg', type: 'image/jpeg' },
      ],
    );
    const parts = entries(form);
    expect(parts.filter(([k]) => k === 'interestIds').map(([, v]) => v)).toEqual(['a', 'b']);
    expect(parts.find(([k]) => k === 'showOnMap')?.[1]).toBe('false');
    // React Native sends { uri, name, type } as a file; the test DOM flattens it, so count the fields.
    expect(parts.filter(([k]) => k === 'images')).toHaveLength(2);
    expect(parts.findIndex(([k]) => k === 'images')).toBeGreaterThan(
      parts.findIndex(([k]) => k === 'status'),
    );
  });
});

describe('PostRepository over the API', () => {
  it('creates with POST /api/v1/posts and returns the id', async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'published' }));
    expect(await repo.create(submission, 'published')).toBe('p9');
    expect(calls[0]?.method).toBe('POST');
    expect(calls[0]?.path).toBe('/api/v1/posts');
    const parts = entries(calls[0]?.body as FormData);
    expect(parts.find(([k]) => k === 'status')?.[1]).toBe('published');
    expect(parts.find(([k]) => k === 'priceCents')?.[1]).toBe('1500000');
  });

  it('clears blank fields with null when updating', async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.update('p9', { ...submission, priceCents: undefined, currency: undefined });
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/api/v1/posts/p9' });
    expect(calls[0]?.body).toMatchObject({ priceCents: null, currency: null, lat: 6.44 });
  });

  it('maps the publish errors by code', async () => {
    const cap = new ApiError({
      code: 'EVENT_MONTHLY_CAP',
      message: 'cap',
      status: 409,
      details: { resetsAt: '2026-11-01T00:00:00Z' },
    });
    const { repo } = fake(() => cap);
    const error = await repo.publish('p9').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(CreatePostError);
    expect(error).toMatchObject({ code: 'eventMonthlyCap', resetsAt: '2026-11-01T00:00:00Z' });

    const invalid = new ApiError({
      code: 'VALIDATION_FAILED',
      message: 'bad',
      status: 400,
      fieldErrors: [{ field: 'images', message: 'At least 2 images' }],
    });
    const second = await fake(() => invalid)
      .repo.create(submission, 'published')
      .catch((e: unknown) => e);
    expect(second).toMatchObject({
      code: 'invalid',
      fieldErrors: [{ field: 'images', message: 'At least 2 images' }],
    });

    const offline = new ApiError({ code: 'NETWORK', message: 'down' });
    expect(
      await fake(() => offline)
        .repo.listInterests()
        .catch((e: unknown) => e),
    ).toMatchObject({
      code: 'network',
    });
  });

  it('reads cities with their pin', async () => {
    const { repo, calls } = fake(() => [
      {
        id: 'ams',
        name: 'Amsterdam',
        countryCode: 'NL',
        label: 'Amsterdam, NL',
        region: '',
        countryName: 'Netherlands',
        lat: 52.37,
        lng: 4.9,
      },
    ]);
    expect(await repo.searchCities('Ams', 10)).toEqual([
      { id: 'ams', name: 'Amsterdam', label: 'Amsterdam, NL', lat: 52.37, lng: 4.9 },
    ]);
    expect(calls[0]?.path).toBe('/api/v1/cities?q=Ams&limit=10');
  });
});
