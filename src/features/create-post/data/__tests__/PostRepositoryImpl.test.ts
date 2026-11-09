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

  it("repeats a Plan's itinerary and sends no money or link on it", async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.create(
      {
        ...submission,
        type: 'plan',
        lat: undefined,
        lng: undefined,
        priceCents: undefined,
        currency: undefined,
        placeId: 'g-ams',
        endAt: '2026-10-22T22:00:00+01:00',
        itinerary: ['Day 1', 'Day 2'],
      },
      'draft',
    );
    const parts = entries(calls[0]?.body as FormData);
    const value = (k: string) => parts.find(([key]) => key === k)?.[1];
    expect(parts.filter(([k]) => k === 'itinerary').map(([, v]) => v)).toEqual(['Day 1', 'Day 2']);
    expect([value('placeId'), value('endAt')]).toEqual(['g-ams', '2026-10-22T22:00:00+01:00']);
    // The shared cost and cityId left the API; a Plan never carries a price, currency or link;
    // and a place id is never sent with a pin.
    for (const key of ['priceCents', 'currency', 'externalUrl', 'costTotalCents', 'costCurrency', 'expectedCount', 'cityId', 'lat', 'lng'])
      expect(value(key)).toBeUndefined();
  });

  it('clears blank fields with null when updating, and only the fields the type takes', async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.update('p9', { ...submission, priceCents: undefined, currency: undefined });
    expect(calls[0]).toMatchObject({ method: 'PATCH', path: '/api/v1/posts/p9' });
    const body = calls[0]?.body as Record<string, unknown>;
    // A skipped price clears both, and the link with them.
    expect(body).toMatchObject({ priceCents: null, currency: null, externalUrl: null, endAt: null, lat: 6.44, lng: 3.47 });
    // A Meetup is sent nothing it would be refused for, not even a null.
    for (const key of ['schedule', 'itinerary', 'costTotalCents', 'expectedCount', 'recurrence', 'cityId', 'placeId'])
      expect(body).not.toHaveProperty(key);
  });

  it("moves a Plan by place id, clears its itinerary, and sends no money fields", async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.update('p9', {
      ...submission,
      type: 'plan',
      lat: undefined,
      lng: undefined,
      priceCents: undefined,
      currency: undefined,
      placeId: 'g-ams',
    });
    expect(calls[0]?.body).toMatchObject({ placeId: 'g-ams', itinerary: null });
    // Never a pin with a place id, and never a null pin (the API keeps a post's place).
    for (const key of ['lat', 'lng', 'cityId']) expect(calls[0]?.body).not.toHaveProperty(key);
    // The API 400s these on a Plan even as null.
    for (const key of ['priceCents', 'currency', 'externalUrl', 'costTotalCents', 'schedule', 'recurrence'])
      expect(calls[0]?.body).not.toHaveProperty(key);
  });

  it("sends a Group's repeat, or null to stop it", async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.update('p9', { ...submission, type: 'group', recurrence: { frequency: 'monthly' } });
    await repo.update('p9', { ...submission, type: 'group' });
    expect(calls[0]?.body).toMatchObject({ recurrence: 'monthly', recurrenceEndsOn: null });
    expect(calls[1]?.body).toMatchObject({ recurrence: null, recurrenceEndsOn: null });
  });

  it('reads a 409 as the draft cap only when creating a draft', async () => {
    const conflict = new ApiError({ code: 'CONFLICT', message: 'x', status: 409 });
    const { repo } = fake(() => conflict);
    expect(await repo.create(submission, 'draft').catch((e: unknown) => e)).toMatchObject({
      code: 'draftLimit',
    });
    expect(await repo.publish('p9').catch((e: unknown) => e)).toMatchObject({ code: 'conflict' });
  });

  it('reads back the new fields of a saved post', async () => {
    const { repo } = fake(() => ({
      id: 'p9',
      type: 'group',
      title: 'Run club',
      description: null,
      startAt: null,
      endAt: '2026-10-22T09:00:00Z',
      placeName: 'Lagos',
      placeId: 'g-lagos',
      formattedAddress: 'Lagos, Nigeria',
      localityLabel: 'Lagos, Nigeria',
      countryCode: 'NG',
      lat: 6.45,
      lng: 3.39,
      capacity: 20,
      price: { amountCents: 250000, currency: 'NGN', exponent: 2 },
      recurrence: { frequency: 'weekly', endsOn: null },
      externalUrl: null,
      waitlistEnabled: false,
      visibility: 'open',
      showOnMap: true,
      interests: [],
      schedule: [],
      itinerary: [],
      images: [],
    }));
    expect(await repo.getPost('p9')).toMatchObject({
      endAt: '2026-10-22T09:00:00Z',
      placeId: 'g-lagos',
      localityLabel: 'Lagos, Nigeria',
      formattedAddress: 'Lagos, Nigeria',
      priceCents: 250000,
      currency: 'NGN',
      recurrence: { frequency: 'weekly', endsOn: null },
    });
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

  it('reads a busy server (503: uploads, or the map lookup down) as "try again shortly"', async () => {
    const busy = new ApiError({ code: 'SERVICE_UNAVAILABLE', message: 'busy', status: 503 });
    expect(await fake(() => busy).repo.create(submission, 'published').catch((e: unknown) => e)).toMatchObject({
      code: 'busy',
    });
  });

  it('leaves the place out of an edit with neither a place id nor a pin', async () => {
    const { repo, calls } = fake(() => ({ id: 'p9', status: 'draft' }));
    await repo.update('p9', { ...submission, lat: undefined, lng: undefined });
    for (const key of ['placeId', 'lat', 'lng']) expect(calls[0]?.body).not.toHaveProperty(key);
  });
});
