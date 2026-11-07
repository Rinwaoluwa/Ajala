import type {
  Account,
  AccountCity,
  BlockedUser,
  DataExport,
  Draft,
  HandleCheck,
  LinkedProvider,
  ProfileEdit,
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
  checkHandle(handle: string): Promise<HandleCheck>;
  searchCities(query: string, limit: number): Promise<AccountCity[]>;
  /** `GET /cities/popular`: up to 12, most live posts first. */
  popularCities(): Promise<AccountCity[]>;

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
