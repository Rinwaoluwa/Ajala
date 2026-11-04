import type {
  Account,
  AccountCity,
  BlockedUser,
  Draft,
  HandleCheck,
  ProfileEdit,
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

  getSettings(): Promise<UserSettings>;
  updateSettings(patch: SettingsPatch): Promise<UserSettings>;

  listSessions(): Promise<Session[]>;
  endSession(sessionId: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  startEmailChange(newEmail: string): Promise<void>;
  confirmEmailChange(code: string): Promise<void>;
  /** `POST /me/reauth { password }`: opens the 5-minute window sensitive calls need. */
  reauthenticate(password: string): Promise<void>;
  /** `DELETE /me`; resolves with when the account is erased. */
  deleteAccount(reason: string | null): Promise<string | null>;

  listDrafts(): Promise<Draft[]>;
  deleteDraft(postId: string): Promise<void>;

  listBlocked(): Promise<BlockedUser[]>;
  unblock(userId: string): Promise<void>;

  getSupportLinks(): Promise<SupportLinks>;
}
