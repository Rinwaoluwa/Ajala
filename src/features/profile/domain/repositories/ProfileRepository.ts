import type {
  CityDetection,
  CitySuggestion,
  HandleAvailability,
  ImageFile,
  Interest,
  MyProfile,
  ProfileUpdate,
} from '../entities/Profile';

/**
 * The profile's contract with the outside world. The data layer implements it
 * over the API (as the signed-in person), the phone's location and Google
 * places (`@core/places`: the API has no city search of its own, spec §1.6).
 *
 * Calls reject with `ProfileError`; the few that answer "nothing" instead say so
 * in their type (`detectHomeCity`).
 */
export interface ProfileRepository {
  getMyProfile(): Promise<MyProfile>;
  /**
   * The extras in it (`languages`, `travelStyles`, `favouriteDestinationIds`) are merged
   * into what the profile already holds, not swapped for it.
   */
  updateProfile(update: ProfileUpdate): Promise<MyProfile>;
  /** Returns the new avatar URL. */
  uploadAvatar(file: ImageFile): Promise<string | null>;
  removeAvatar(): Promise<void>;
  /**
   * The city the phone is in. Shows the system's location prompt first when it
   * may still be shown. Never rejects: a failure is a `CityDetection` kind.
   */
  detectHomeCity(): Promise<CityDetection>;
  /**
   * Cities matching what was typed. Rejects with `placesUnavailable` when the
   * search cannot be reached; a cancelled `signal` rejects with its own abort.
   */
  searchCities(query: string, signal?: AbortSignal): Promise<CitySuggestion[]>;
  /**
   * Countries, regions and cities matching what was typed, for favourite
   * destinations ("Qatar", "Bali"). Rejects as `searchCities` does.
   */
  searchDestinations(query: string, signal?: AbortSignal): Promise<CitySuggestion[]>;
  /** A city search closed without looking a place up: start a fresh billing session next time. */
  endCitySearch(): void;
  listInterests(): Promise<Interest[]>;
  checkHandle(handle: string): Promise<HandleAvailability>;
}
