import type { City, Gender, HandleAvailability, ImageFile, ProfileUpdate } from '../entities/Profile';
import { ProfileError } from '../entities/ProfileError';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { handleFormatProblem, normalizeHandle } from '../rules/handleRules';
import {
  MAX_INTERESTS,
  MAX_LANGUAGES,
  MIN_INTERESTS,
  isFullNameValid,
  splitFullName,
} from '../rules/profileSetupRules';

/**
 * Profile setup's use cases. All four setup screens write to the same
 * `PATCH /me` (API map §3); this sends one, at the end, with everything — the
 * server stamps `profileCompletedAt` itself once first name, last name, date of
 * birth and gender are all present (§2.4). The handle is its own `PATCH`
 * afterwards, because it can be refused on its own (409).
 */

export const makeGetMyProfile = (repo: ProfileRepository) => () => repo.getMyProfile();

export type SetupAnswers = {
  homeCityId: string;
  languages: readonly string[];
  gender: Gender;
  /** Only when the profile has no name yet. */
  fullName?: string;
  /** Only when it has no date of birth yet. YYYY-MM-DD. */
  dateOfBirth?: string;
  /** Left out when the person skipped "What are you into?". */
  interestIds?: readonly string[];
};

export const makeSaveSetup = (repo: ProfileRepository) => async (answers: SetupAnswers) => {
  const update: ProfileUpdate = {
    homeCityId: answers.homeCityId,
    gender: answers.gender,
    languages: answers.languages.slice(0, MAX_LANGUAGES),
  };
  if (answers.fullName !== undefined) {
    if (!isFullNameValid(answers.fullName)) throw new ProfileError('invalidDetails');
    Object.assign(update, splitFullName(answers.fullName));
  }
  if (answers.dateOfBirth !== undefined) update.dateOfBirth = answers.dateOfBirth;
  // Fewer than the screen's minimum is the same as skipping: the API would refuse under 3.
  const interests = answers.interestIds ?? [];
  if (interests.length >= MIN_INTERESTS) update.interestIds = interests.slice(0, MAX_INTERESTS);

  return repo.updateProfile(update);
};

/**
 * Whether a handle can be had. A format the API would refuse is answered here,
 * without a request.
 */
export const makeCheckHandle =
  (repo: ProfileRepository) =>
  async (input: string): Promise<HandleAvailability> => {
    const handle = normalizeHandle(input);
    if (handleFormatProblem(handle)) return { available: false, reason: 'format' };
    return repo.checkHandle(handle);
  };

export const makeChooseHandle = (repo: ProfileRepository) => async (input: string) => {
  const handle = normalizeHandle(input);
  if (handleFormatProblem(handle)) throw new ProfileError('handleInvalid');
  return repo.updateProfile({ handle });
};

export const makeUploadAvatar = (repo: ProfileRepository) => (file: ImageFile) => repo.uploadAvatar(file);
export const makeRemoveAvatar = (repo: ProfileRepository) => () => repo.removeAvatar();
export const makeDetectHomeCity = (repo: ProfileRepository) => () => repo.detectHomeCity();

/** Searches from two characters; anything shorter matches too much to be useful. */
export const makeSearchCities =
  (repo: ProfileRepository) =>
  async (query: string, limit = 10): Promise<City[]> => {
    const q = query.trim();
    return q.length < 2 ? [] : repo.searchCities(q, limit);
  };

export const makeListInterests = (repo: ProfileRepository) => () => repo.listInterests();
