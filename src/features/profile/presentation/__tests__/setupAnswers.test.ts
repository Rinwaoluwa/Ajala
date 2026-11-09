import { describe, expect, it } from '@jest/globals';

import type { MyProfile, ProfileUpdate } from '../../domain/entities/Profile';
import type { ProfileRepository } from '../../domain/repositories/ProfileRepository';
import { makeSaveSetup } from '../../domain/usecases/ProfileSetupUseCases';
import type { SetupDraft } from '../state/ProfileSetupContext';
import { setupAnswers } from '../state/setupAnswers';

/** Everything skipped: no city (a deep link past basics), no languages, styles, places or interests. */
const SKIPPED: SetupDraft = {
  homeCity: null,
  cityDetected: false,
  languages: [],
  gender: null,
  fullName: '',
  dateOfBirth: null,
  travelStyles: [],
  destinations: [],
  interestIds: [],
  skippedInterests: true,
};

/** An email sign-up: name and date of birth came with the account. */
const HAS_BASICS = { name: false, dateOfBirth: false };

function recordingRepo() {
  const updates: ProfileUpdate[] = [];
  const repo = {
    updateProfile: async (update: ProfileUpdate) => {
      updates.push(update);
      return { profileCompletedAt: '2026-11-09T10:00:00Z' } as MyProfile;
    },
  } as unknown as ProfileRepository;
  return { repo, updates };
}

describe('the answers profile setup saves', () => {
  it('always reach PATCH /me, even when every step was skipped', async () => {
    const { repo, updates } = recordingRepo();
    await makeSaveSetup(repo)(setupAnswers(SKIPPED, HAS_BASICS, 'Africa/Lagos'));
    expect(updates).toHaveLength(1);
    // The time zone keeps the body from being empty.
    expect(updates[0]).toMatchObject({ timezone: 'Africa/Lagos' });
    expect(updates[0]).not.toHaveProperty('homePlaceId');
    expect(updates[0]).not.toHaveProperty('interestIds');
    // An email sign-up's name and date of birth are not sent again.
    expect(updates[0]).not.toHaveProperty('firstName');
    expect(updates[0]).not.toHaveProperty('dateOfBirth');
  });

  it('carry what the steps collected', () => {
    const answers = setupAnswers(
      {
        ...SKIPPED,
        homeCity: { placeId: 'ChIJ-london', name: 'London', countryCode: 'GB', label: 'London, United Kingdom' },
        languages: ['en'],
        destinations: [{ placeId: 'ChIJ-accra', name: 'Accra', countryCode: 'GH', label: 'Accra, Ghana' }],
        interestIds: ['a', 'b', 'c'],
        skippedInterests: false,
      },
      HAS_BASICS,
      undefined,
    );
    expect(answers).toMatchObject({
      homePlaceId: 'ChIJ-london',
      languages: ['en'],
      favouriteDestinationIds: ['ChIJ-accra'],
      interestIds: ['a', 'b', 'c'],
    });
  });

  it('send a name and date of birth only when the account lacks them', () => {
    const answers = setupAnswers(
      { ...SKIPPED, fullName: 'Ada Obi', dateOfBirth: '1990-01-02' },
      { name: true, dateOfBirth: true },
      undefined,
    );
    expect(answers).toMatchObject({ fullName: 'Ada Obi', dateOfBirth: '1990-01-02' });
  });
});
