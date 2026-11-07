import { describe, expect, it } from '@jest/globals';

import type { MyProfile, ProfileUpdate } from '../entities/Profile';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { makeCheckHandle, makeChooseHandle, makeSaveSetup } from '../usecases/ProfileSetupUseCases';

const PROFILE: MyProfile = {
  id: 'u1',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  handle: null,
  dateOfBirth: '1994-03-02',
  gender: null,
  avatarUrl: null,
  homeCity: null,
  interests: [],
  languages: [],
  travelStyles: [],
  favouriteCities: [],
  visiting: null,
  subscribed: false,
  profileCompletedAt: null,
};

function fakeRepo() {
  const updates: ProfileUpdate[] = [];
  const checks: string[] = [];
  const repo: ProfileRepository = {
    getMyProfile: async () => PROFILE,
    updateProfile: async (update) => {
      updates.push(update);
      return { ...PROFILE, profileCompletedAt: '2026-10-22T10:00:00Z' };
    },
    uploadAvatar: async () => 'https://cdn/a.jpg',
    removeAvatar: async () => undefined,
    detectHomeCity: async () => null,
    searchCities: async () => [],
    popularCities: async () => [],
    listInterests: async () => [],
    checkHandle: async (handle) => {
      checks.push(handle);
      return { available: true };
    },
  };
  return { repo, updates, checks };
}

const answers = {
  homeCityId: 'lon',
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
        homeCityId: 'lon',
        gender: 'woman',
        languages: ['en', 'es'],
        interestIds: ['a', 'b', 'c', 'd', 'e'],
      },
    ]);
  });

  it('sends travel styles and favourite cities, capped at ten each', async () => {
    const { repo, updates } = fakeRepo();
    const cities = Array.from({ length: 12 }, (_, i) => `c${i}`);
    await makeSaveSetup(repo)({
      ...answers,
      travelStyles: ['solo', 'foodie'],
      favouriteCityIds: cities,
    });
    expect(updates[0]).toMatchObject({
      travelStyles: ['solo', 'foodie'],
      favouriteCityIds: cities.slice(0, 10),
    });
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
