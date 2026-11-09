import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';
import { PlacesError, cityAt, endPlacesSession, searchCities } from '@core/places';

import { createProfileRepository } from '../repositories/ProfileRepositoryImpl';

jest.mock('@core/location/deviceLocation', () => ({
  getLocationPermission: async () => 'granted',
  requestLocationPermission: async () => 'granted',
  getCurrentCoordinates: async () => ({ lat: 51.5, lng: -0.12 }),
}));
// Google is never asked: the repository's place calls are stubbed, the error type is the real one.
jest.mock('@core/places', () => {
  const types = jest.requireActual<typeof import('@core/places/placesTypes')>('@core/places/placesTypes');
  return {
    ...types,
    cityAt: jest.fn(),
    searchCities: jest.fn(),
    endPlacesSession: jest.fn(),
  };
});
const mockCityAt = cityAt as jest.MockedFunction<typeof cityAt>;
const mockSearchCities = searchCities as jest.MockedFunction<typeof searchCities>;

const ME = {
  id: 'u1',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  handle: null,
  dob: '1994-03-02',
  gender: null,
  avatarUrl: null,
  homePlace: null,
  visiting: null,
  interests: [],
  extras: { pronouns: 'she/her', languages: ['fr'], travelStyles: ['solo'] } as Record<string, unknown>,
  favouriteDestinations: [{ placeId: 'ChIJ-accra', countryCode: 'GH', label: 'Accra, Ghana' }],
  subscribed: true,
  subscribedUntil: '2026-12-01T00:00:00Z',
  profileCompletedAt: null,
  bio: null,
  photos: [],
  verified: false,
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
        // Favourite destinations come back outside extras; they are carried over so this does not clear them.
        extras: {
          pronouns: 'she/her',
          languages: ['en'],
          travelStyles: ['solo'],
          favouriteDestinationIds: ['ChIJ-accra'],
        },
      },
    });
  });

  it('never sends the old favouriteCityIds key: PATCH /me rejects fields it does not list', async () => {
    const { request, calls } = fakeRequest(() => ({
      ...ME,
      extras: { ...ME.extras, favouriteCityIds: ['old'] },
    }));
    const repo = createProfileRepository(request);
    await repo.getMyProfile();
    await repo.updateProfile({ languages: ['en'] });
    expect((calls[1]?.body as { extras: Record<string, unknown> }).extras).not.toHaveProperty(
      'favouriteCityIds',
    );
  });

  it("reads the home place, travel styles, favourite destinations and the server's completion stamp", async () => {
    const { request } = fakeRequest(() => ({
      ...ME,
      homePlace: { placeId: 'ChIJ-lagos', label: 'Lagos, Nigeria', countryCode: 'NG' },
      profileCompletedAt: '2026-11-01T10:00:00Z',
    }));
    const me = await createProfileRepository(request).getMyProfile();
    expect(me).toMatchObject({
      homePlace: { placeId: 'ChIJ-lagos', name: 'Lagos', label: 'Lagos, Nigeria', countryCode: 'NG' },
      travelStyles: ['solo'],
      favouriteDestinations: [{ placeId: 'ChIJ-accra', name: 'Accra', label: 'Accra, Ghana' }],
      subscribed: true,
      profileCompletedAt: '2026-11-01T10:00:00Z',
    });
  });

  it('saves the home place, travel styles and favourite destinations by place id', async () => {
    const { request, calls } = fakeRequest(() => ME);
    const repo = createProfileRepository(request);
    await repo.getMyProfile();
    await repo.updateProfile({
      homePlaceId: 'ChIJ-lagos',
      travelStyles: ['beach', 'foodie'],
      favouriteDestinationIds: ['ChIJ-lisbon', 'ChIJ-accra'],
    });
    expect(calls[1]?.body).toEqual({
      homePlaceId: 'ChIJ-lagos',
      extras: {
        pronouns: 'she/her',
        languages: ['fr'],
        travelStyles: ['beach', 'foodie'],
        favouriteDestinationIds: ['ChIJ-lisbon', 'ChIJ-accra'],
      },
    });
  });

  it('searches cities with Google places, never the API, and passes the abort signal on', async () => {
    mockSearchCities.mockResolvedValueOnce([
      { placeId: 'ChIJ-lagos', primaryText: 'Lagos', secondaryText: 'Nigeria' },
    ]);
    const { request, calls } = fakeRequest(() => ME);
    const signal = new AbortController().signal;
    expect(await createProfileRepository(request).searchCities('lag', signal)).toEqual([
      { placeId: 'ChIJ-lagos', name: 'Lagos', label: 'Lagos, Nigeria', countryCode: null, detail: 'Nigeria' },
    ]);
    expect(mockSearchCities).toHaveBeenCalledWith('lag', null, signal);
    expect(calls).toHaveLength(0);
  });

  it('reads any places failure as placesUnavailable, and ends the session on request', async () => {
    mockSearchCities.mockRejectedValueOnce(new PlacesError('denied', 'refused'));
    const repo = createProfileRepository(fakeRequest(() => ME).request);
    await expect(repo.searchCities('lag')).rejects.toMatchObject({ code: 'placesUnavailable' });
    repo.endCitySearch();
    expect(endPlacesSession).toHaveBeenCalled();
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

  it('finds the home city from the phone with cityAt, and says notFound when there is none or it fails', async () => {
    const { request, calls } = fakeRequest(() => ME);
    const repo = createProfileRepository(request);

    mockCityAt.mockResolvedValueOnce({ placeId: 'ChIJ-london', name: 'London' });
    expect(await repo.detectHomeCity()).toEqual({
      kind: 'found',
      city: { placeId: 'ChIJ-london', name: 'London', label: 'London', countryCode: null },
    });
    expect(mockCityAt).toHaveBeenCalledWith(51.5, -0.12);

    mockCityAt.mockResolvedValueOnce(null);
    expect(await repo.detectHomeCity()).toEqual({ kind: 'notFound' });
    mockCityAt.mockRejectedValueOnce(new PlacesError('unavailable', 'no geocoder'));
    expect(await repo.detectHomeCity()).toEqual({ kind: 'notFound' });
    expect(calls).toHaveLength(0);
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
