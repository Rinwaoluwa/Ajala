import type {
  Account,
  AccountPlace,
  CitySuggestion,
  BlockedUser,
  DataExport,
  Draft,
  HandleCheck,
  Interest,
  LinkedProvider,
  ProfileEdit,
  ProfilePhoto,
  ReauthProof,
  ReportsPage,
  Session,
  SettingsPatch,
  SupportLinks,
  UserSettings,
} from '../entities/Settings';

/**
 * What Settings needs from the API (API map §10). Implemented over HTTP in
 * `data/`; every method throws `SettingsError`.
 */
export interface SettingsRepository {
  getAccount(): Promise<Account>;
  /** `PATCH /me`; the extras record is merged here, not by the caller. */
  updateAccount(edit: ProfileEdit, current: Account): Promise<Account>;
  uploadAvatar(file: { uri: string; name: string; type: string }): Promise<string | null>;
  /** `POST /me/photos`: the new photo; `galleryFull` once there are six. */
  addPhoto(file: { uri: string; name: string; type: string }): Promise<ProfilePhoto>;
  removePhoto(photoId: string): Promise<void>;
  /** Every photo id in the new order; answers the gallery as it now stands. */
  reorderPhotos(ids: string[]): Promise<ProfilePhoto[]>;
  /** `GET /interests`: what the profile may pick from, in display order. */
  listInterests(): Promise<Interest[]>;
  checkHandle(handle: string): Promise<HandleCheck>;
  /**
   * Cities matching what was typed, from Google places (`@core/places`; the API
   * has no city search). Rejects with `placesUnavailable` when Google cannot be reached.
   */
  searchCities(query: string, signal?: AbortSignal): Promise<CitySuggestion[]>;
  /** Countries, regions and cities, for favourite destinations ("Qatar", "Bali"). Rejects as `searchCities`. */
  searchDestinations(query: string, signal?: AbortSignal): Promise<CitySuggestion[]>;
  /** A city search closed without looking a place up: the next one starts a new billing session. */
  endCitySearch(): void;
  /**
   * The city the phone is in, for "Current city". Asks for location when the
   * system still allows the prompt. Null when location is refused, unreadable,
   * or no city is found. Never rejects.
   */
  detectCurrentCity(): Promise<AccountPlace | null>;

  getSettings(): Promise<UserSettings>;
  updateSettings(patch: SettingsPatch): Promise<UserSettings>;
  /** `PATCH /me/analytics { enabled }`: answers the whole settings object. */
  setAnalytics(enabled: boolean): Promise<UserSettings>;

  listSessions(): Promise<Session[]>;
  endSession(sessionId: string): Promise<void>;
  /** `POST /auth/logout/all`: every session ends, this one included. */
  signOutEverywhere(): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  /** `POST /me/password/set`: a first password for a Google- or Apple-only account. */
  setPassword(newPassword: string): Promise<void>;
  startEmailChange(newEmail: string): Promise<void>;
  confirmEmailChange(code: string): Promise<void>;
  /** `POST /me/reauth/code`: emails a code, for accounts with no password. */
  sendReauthCode(): Promise<void>;
  /** `POST /me/reauth { password | code }`: opens the 5-minute window sensitive calls need. */
  reauthenticate(proof: ReauthProof): Promise<void>;
  /** `DELETE /me/identities/{provider}`. */
  unlinkIdentity(provider: LinkedProvider): Promise<void>;
  /** `DELETE /me`; resolves with when the account is erased. */
  deleteAccount(reason: string | null): Promise<string | null>;

  /** `POST /me/export`. */
  requestExport(): Promise<DataExport>;
  /** `GET /me/export`; null when none was ever asked for (404). */
  getExport(): Promise<DataExport | null>;

  /** `GET /me/reports`, newest first; `cursor` null for the first page. */
  listReports(cursor: string | null): Promise<ReportsPage>;

  listDrafts(): Promise<Draft[]>;
  deleteDraft(postId: string): Promise<void>;

  listBlocked(): Promise<BlockedUser[]>;
  unblock(userId: string): Promise<void>;

  getSupportLinks(): Promise<SupportLinks>;
}
