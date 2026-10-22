import type {
  City,
  HandleAvailability,
  ImageFile,
  Interest,
  MyProfile,
  ProfileUpdate,
} from '../entities/Profile';

/**
 * The profile's contract with the outside world. The data layer implements it
 * over the API (as the signed-in person) and the phone's location.
 *
 * Calls reject with `ProfileError`; the few that answer "nothing" instead say so
 * in their type (`detectHomeCity`).
 */
export interface ProfileRepository {
  getMyProfile(): Promise<MyProfile>;
  /** A partial record (`languages`) is merged into what the profile holds, not swapped for it. */
  updateProfile(update: ProfileUpdate): Promise<MyProfile>;
  /** Returns the new avatar URL. */
  uploadAvatar(file: ImageFile): Promise<string | null>;
  removeAvatar(): Promise<void>;
  /** The city the phone is in, or null when location is off or unreadable. */
  detectHomeCity(): Promise<City | null>;
  searchCities(query: string, limit: number): Promise<City[]>;
  listInterests(): Promise<Interest[]>;
  checkHandle(handle: string): Promise<HandleAvailability>;
}
