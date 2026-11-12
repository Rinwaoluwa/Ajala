import type {
  CitySuggestion,
  Gender,
  HandleAvailability,
  ImageFile,
  ProfileUpdate,
  TravelStyle,
} from '../entities/Profile';
import { ProfileError } from '../entities/ProfileError';
import type { ProfileRepository } from '../repositories/ProfileRepository';
import { handleFormatProblem, normalizeHandle } from '../rules/handleRules';
import {
  MAX_DESTINATIONS,
  MAX_INTERESTS,
  MAX_LANGUAGES,
  MAX_TRAVEL_STYLES,
  MIN_INTERESTS,
  isFullNameValid,
  splitFullName,
} from '../rules/profileSetupRules';

/**
 * Profile setup's use cases. All four setup screens write to the same
 * `PATCH /me` (API map §3); this sends one, at the end, with everything. The
 * server stamps `profileCompletedAt` itself when it considers the profile
 * complete (§2.4); the answer carries it, and nothing here decides it. The
 * handle is its own `PATCH` afterwards, because it can be refused on its own
 * (409).
 *
 * That `PATCH /me` is sent on every run, whatever was skipped: an email
 * sign-up already has its name and date of birth, but stays incomplete until
 * its first `PATCH /me` (backend answers A1).
 */

export const makeGetMyProfile = (repo: ProfileRepository) => () => repo.getMyProfile();

export type SetupAnswers = {
  /** The home city's Google place id. Required by the basics step; missing only if a deep link skipped it. */
  homePlaceId?: string | null;
  /** Left out when empty, so an empty list never clears languages already saved. */
  languages?: readonly string[];
  /** Optional (spec §2.4, §8.1): left out when the person did not pick one. */
  gender?: Gender | null;
  /** "How do you like to travel?"; capped at the API's 10. */
  travelStyles?: readonly TravelStyle[];
  /** "Where do you love to travel?", as cities' Google place ids; capped at the API's 10. */
  favouriteDestinationIds?: readonly string[];
  /** Only when the profile has no name yet. */
  fullName?: string;
  /** Only when it has no date of birth yet. YYYY-MM-DD. */
  dateOfBirth?: string;
  /** Left out when the person skipped "What are you into?". */
  interestIds?: readonly string[];
  /**
   * The phone's IANA zone. Always sent when known: the API stores it for
   * reminders, and it means the update is never empty, however much was skipped.
   */
  timezone?: string;
};

/**
 * Always one `PATCH /me`, even when every optional step was skipped (see
 * above): it is what completes an email sign-up. Only a name the API would
 * refuse stops it, as the basics step would not have let it through.
 */
export const makeSaveSetup = (repo: ProfileRepository) => async (answers: SetupAnswers) => {
  const update: ProfileUpdate = {};
  if (answers.homePlaceId) update.homePlaceId = answers.homePlaceId;
  if (answers.languages?.length) update.languages = answers.languages.slice(0, MAX_LANGUAGES);
  if (answers.timezone) update.timezone = answers.timezone;
  if (answers.gender) update.gender = answers.gender;
  if (answers.travelStyles) update.travelStyles = answers.travelStyles.slice(0, MAX_TRAVEL_STYLES);
  // An 11th is a 400 that would fail the whole setup save, so the list is capped here too.
  if (answers.favouriteDestinationIds)
    update.favouriteDestinationIds = answers.favouriteDestinationIds.slice(0, MAX_DESTINATIONS);
  if (answers.fullName !== undefined) {
    if (!isFullNameValid(answers.fullName)) throw new ProfileError('invalidDetails');
    Object.assign(update, splitFullName(answers.fullName));
  }
  if (answers.dateOfBirth !== undefined) update.dateOfBirth = answers.dateOfBirth;
  // Fewer than the screen's minimum is the same as skipping: the API would refuse under 3.
  const interests = answers.interestIds ?? [];
  if (interests.length >= MIN_INTERESTS) update.interestIds = interests.slice(0, MAX_INTERESTS);

  try {
    return await repo.updateProfile(update);
  } catch (e) {
    // The server could not look the places up: save the rest so setup still
    // finishes. The city and destinations can be set again from Edit profile.
    const hasPlaces = update.homePlaceId !== undefined || update.favouriteDestinationIds !== undefined;
    if (!hasPlaces || !(e instanceof ProfileError) || e.code !== 'placesUnavailable') throw e;
    const { homePlaceId: _city, favouriteDestinationIds: _destinations, ...rest } = update;
    return repo.updateProfile(rest);
  }
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

/**
 * Searches from two characters; anything shorter matches too much to be useful
 * (and each keystroke sent to Google is billed). `limit` trims what is shown.
 */
export const makeSearchCities =
  (repo: ProfileRepository) =>
  async (query: string, { limit = 10, signal }: { limit?: number; signal?: AbortSignal } = {}): Promise<
    CitySuggestion[]
  > => {
    const q = query.trim();
    return q.length < 2 ? [] : (await repo.searchCities(q, signal)).slice(0, limit);
  };

/** Favourite destinations: countries and regions too ("Qatar", "Bali"). Same rules as `makeSearchCities`. */
export const makeSearchDestinations =
  (repo: ProfileRepository) =>
  async (query: string, { limit = 10, signal }: { limit?: number; signal?: AbortSignal } = {}): Promise<
    CitySuggestion[]
  > => {
    const q = query.trim();
    return q.length < 2 ? [] : (await repo.searchDestinations(q, signal)).slice(0, limit);
  };

export const makeEndCitySearch = (repo: ProfileRepository) => () => repo.endCitySearch();

export const makeListInterests = (repo: ProfileRepository) => () => repo.listInterests();
