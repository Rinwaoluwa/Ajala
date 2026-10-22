import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { createProfileRepository } from '../repositories/ProfileRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getLocationPermission: async () => 'granted',
  getCurrentCoordinates: async () => ({ lat: 51.5, lng: -0.12 }),
}));

const ME = {
  id: 'u1',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  handle: null,
  dob: '1994-03-02',
  gender: null,
  avatarUrl: null,
  homeCity: null,
  interests: [],
  extras: { pronouns: 'she/her', languages: ['fr'] },
  profileCompletedAt: null,
};

type Call = { method: string; path: string; body?: unknown };

function fakeRequest(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { request, calls };
}

describe('profile repository', () => {
  it('merges languages into the extras the profile already has', async () => {
    const { request, calls } = fakeRequest(() => ME);
    const repo = createProfileRepository(request);
    await repo.getMyProfile();
    await repo.updateProfile({ languages: ['en'], gender: 'woman' });

    expect(calls[1]).toEqual({
      method: 'PATCH',
      path: '/api/v1/me',
      body: {
        gender: 'woman',
        extras: { pronouns: 'she/her', languages: ['en'] },
      },
    });
  });

  it('reads 409 on a handle as taken, and HANDLE_COOLDOWN with its date', async () => {
    const taken = fakeRequest(() => new ApiError({ code: 'CONFLICT', message: 'taken', status: 409 }));
    await expect(
      createProfileRepository(taken.request).updateProfile({ handle: 'sarah' }),
    ).rejects.toMatchObject({
      code: 'handleTaken',
    });

    const cooldown = fakeRequest(
      () =>
        new ApiError({
          code: 'HANDLE_COOLDOWN',
          message: 'later',
          status: 409,
          details: { availableAt: '2026-11-20T00:00:00Z' },
        }),
    );
    await expect(
      createProfileRepository(cooldown.request).updateProfile({
        handle: 'sarah',
      }),
    ).rejects.toMatchObject({
      code: 'handleCooldown',
      availableAt: '2026-11-20T00:00:00Z',
    });
  });

  it('resolves the home city from the phone, and answers null when the API has none', async () => {
    const city = {
      id: 'lon',
      name: 'London',
      countryCode: 'GB',
      label: 'London, UK',
      region: '',
      countryName: 'United Kingdom',
      timezone: 'Europe/London',
      lat: 0,
      lng: 0,
    };
    const found = fakeRequest(() => ({ city, distanceKm: 2 }));
    expect(await createProfileRepository(found.request).detectHomeCity()).toMatchObject({
      id: 'lon',
      label: 'London, UK',
    });
    expect(found.calls[0]?.path).toBe('/api/v1/cities/resolve?lat=51.5&lng=-0.12');

    const none = fakeRequest(() => new ApiError({ code: 'NOT_FOUND', message: 'none', status: 404 }));
    expect(await createProfileRepository(none.request).detectHomeCity()).toBeNull();
  });

  it('uploads the avatar as multipart, field "file"', async () => {
    const { request, calls } = fakeRequest(() => ({
      avatarUrl: 'https://cdn/a.jpg',
    }));
    const url = await createProfileRepository(request).uploadAvatar({
      uri: 'file:///a.jpg',
      name: 'a.jpg',
      type: 'image/jpeg',
    });
    expect(url).toBe('https://cdn/a.jpg');
    expect(calls[0]?.body).toBeInstanceOf(FormData);
  });
});
