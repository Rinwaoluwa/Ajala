import { describe, expect, it } from '@jest/globals';

import type { MyProfile, ProfileUpdate } from '../entities/Profile';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { makeCheckHandle, makeChooseHandle, makeSaveSetup, makeSearchCities } from '../usecases/ProfileSetupUseCases';

const PROFILE: MyProfile = {
  id: 'u1',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  handle: null,
  dateOfBirth: '1994-03-02',
  gender: null,
  avatarUrl: null,
  homePlace: null,
  interests: [],
  languages: [],
  travelStyles: [],
  favouriteDestinations: [],
  subscribed: false,
  profileCompletedAt: null,
};

function fakeRepo() {
  const updates: ProfileUpdate[] = [];
  const checks: string[] = [];
  const searches: string[] = [];
  const repo: ProfileRepository = {
    getMyProfile: async () => PROFILE,
    updateProfile: async (update) => {
      updates.push(update);
      return { ...PROFILE, profileCompletedAt: '2026-10-22T10:00:00Z' };
    },
    uploadAvatar: async () => 'https://cdn/a.jpg',
    removeAvatar: async () => undefined,
    detectHomeCity: async () => ({ kind: 'notFound' }),
    searchCities: async (query) => {
      searches.push(query);
      return Array.from({ length: 8 }, (_, i) => ({
        placeId: `ChIJ-${i}`,
        name: `${query} ${i}`,
        label: `${query} ${i}`,
        countryCode: null,
        detail: '',
      }));
    },
    endCitySearch: () => undefined,
    listInterests: async () => [],
    checkHandle: async (handle) => {
      checks.push(handle);
      return { available: true };
    },
  };
  return { repo, updates, checks, searches };
}

const answers = {
  homePlaceId: 'ChIJ-london',
  languages: ['en', 'es'],
  gender: 'woman' as const,
};

describe('saving setup', () => {
  it('sends the whole setup in one update', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)({
      ...answers,
      interestIds: ['a', 'b', 'c', 'd', 'e'],
    });
    expect(updates).toEqual([
      {
        homePlaceId: 'ChIJ-london',
        gender: 'woman',
        languages: ['en', 'es'],
        interestIds: ['a', 'b', 'c', 'd', 'e'],
      },
    ]);
  });

  it('sends travel styles and favourite destinations, capped at ten each (an 11th is a 400)', async () => {
    const { repo, updates } = fakeRepo();
    const cities = Array.from({ length: 12 }, (_, i) => `ChIJ-${i}`);
    await makeSaveSetup(repo)({
      ...answers,
      travelStyles: ['solo', 'foodie'],
      favouriteDestinationIds: cities,
    });
    expect(updates[0]).toMatchObject({
      travelStyles: ['solo', 'foodie'],
      favouriteDestinationIds: cities.slice(0, 10),
    });
    expect(updates[0]).not.toHaveProperty('favouriteCityIds');
    expect(updates[0]).not.toHaveProperty('homeCityId');
  });

  it('leaves gender out when none was picked: it is optional', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)({ ...answers, gender: null });
    expect(updates[0]).not.toHaveProperty('gender');
  });

  it('leaves interests out when skipped or too few', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)(answers);
    await makeSaveSetup(repo)({ ...answers, interestIds: ['a', 'b'] });
    expect(updates.map((u) => u.interestIds)).toEqual([undefined, undefined]);
  });

  it('splits a collected name and sends a collected date of birth', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)({
      ...answers,
      fullName: 'Sarah Jane Mitchell',
      dateOfBirth: '1994-03-02',
    });
    expect(updates[0]).toMatchObject({
      firstName: 'Sarah',
      lastName: 'Jane Mitchell',
      dateOfBirth: '1994-03-02',
    });
  });

  it('still sends a PATCH when every optional step was skipped (A1: it completes an email sign-up)', async () => {
    const { repo, updates } = fakeRepo();
    const saved = await makeSaveSetup(repo)({
      languages: [],
      gender: null,
      interestIds: undefined,
      timezone: 'Africa/Lagos',
    });
    expect(updates).toEqual([{ timezone: 'Africa/Lagos' }]);
    expect(saved.profileCompletedAt).not.toBeNull();
  });

  it('sends the PATCH even with nothing collected and no time zone', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)({});
    expect(updates).toEqual([{}]);
  });

  it('sends the time zone with everything else', async () => {
    const { repo, updates } = fakeRepo();
    await makeSaveSetup(repo)({ ...answers, timezone: 'Europe/London' });
    expect(updates[0]).toMatchObject({ homePlaceId: 'ChIJ-london', timezone: 'Europe/London' });
  });

  it('refuses a one-word name without calling the API', async () => {
    const { repo, updates } = fakeRepo();
    await expect(makeSaveSetup(repo)({ ...answers, fullName: 'Sarah' })).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    expect(updates).toHaveLength(0);
  });
});

describe('the handle', () => {
  it('answers a bad format without asking the API', async () => {
    const { repo, checks } = fakeRepo();
    expect(await makeCheckHandle(repo)('ab')).toEqual({
      available: false,
      reason: 'format',
    });
    expect(checks).toHaveLength(0);
  });

  it('asks about a handle that could be valid, without its @', async () => {
    const { repo, checks } = fakeRepo();
    await makeCheckHandle(repo)('@sarah.m');
    expect(checks).toEqual(['sarah.m']);
  });

  it('saves the normalised handle', async () => {
    const { repo, updates } = fakeRepo();
    await makeChooseHandle(repo)(' @sarah.m ');
    expect(updates).toEqual([{ handle: 'sarah.m' }]);
  });
});

describe('city search', () => {
  it('asks from two characters, trimmed, and trims the answer to the limit', async () => {
    const { repo, searches } = fakeRepo();
    const search = makeSearchCities(repo);
    expect(await search(' l ')).toEqual([]);
    expect(await search(' lag ', { limit: 5 })).toHaveLength(5);
    expect(searches).toEqual(['lag']);
  });
});
