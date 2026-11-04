import { SettingsError } from '../entities/SettingsError';
import type { Account, ProfileEdit, SettingsPatch } from '../entities/Settings';
import type { SettingsRepository } from '../repositories/SettingsRepository';
import {
  BIO_MAX,
  DELETE_REASON_MAX,
  diffProfile,
  isEmailLike,
  isHandleFormatValid,
  isPasswordValid,
  normaliseHandle,
  sortDrafts,
  sortSessions,
} from '../rules/settingsRules';

/** The Settings use cases. Most pass through; the rest check before a request is spent. */

export const makeGetAccount = (repo: SettingsRepository) => () => repo.getAccount();

/** Sends only what changed; nothing changed is not a request. */
export const makeSaveProfile =
  (repo: SettingsRepository) =>
  async (account: Account, next: ProfileEdit): Promise<Account> => {
    const edit = diffProfile(account, {
      ...next,
      ...(next.handle !== undefined ? { handle: normaliseHandle(next.handle) } : null),
    });
    if (edit.handle !== undefined && !isHandleFormatValid(edit.handle))
      throw new SettingsError('invalidDetails');
    if (edit.bio && edit.bio.length > BIO_MAX) throw new SettingsError('invalidDetails');
    if (Object.keys(edit).length === 0) return account;
    return repo.updateAccount(edit, account);
  };

export const makeUploadAvatar =
  (repo: SettingsRepository) => (file: { uri: string; name: string; type: string }) =>
    repo.uploadAvatar(file);

/** Format first (no request for "a!"), then the server. */
export const makeCheckHandle = (repo: SettingsRepository) => async (raw: string) => {
  const handle = normaliseHandle(raw);
  if (!isHandleFormatValid(handle)) return { available: false, reason: 'format' as const };
  return repo.checkHandle(handle);
};

export const makeSearchCities = (repo: SettingsRepository) => async (query: string) => {
  const q = query.trim();
  return q.length < 2 ? [] : repo.searchCities(q, 10);
};

export const makeGetSettings = (repo: SettingsRepository) => () => repo.getSettings();
export const makeUpdateSettings = (repo: SettingsRepository) => (patch: SettingsPatch) =>
  repo.updateSettings(patch);

export const makeListSessions = (repo: SettingsRepository) => async () =>
  sortSessions(await repo.listSessions());
export const makeEndSession = (repo: SettingsRepository) => (id: string) => repo.endSession(id);

export const makeChangePassword =
  (repo: SettingsRepository) => async (currentPassword: string, newPassword: string) => {
    if (!currentPassword || !isPasswordValid(newPassword)) throw new SettingsError('invalidDetails');
    return repo.changePassword(currentPassword, newPassword);
  };

export const makeStartEmailChange = (repo: SettingsRepository) => async (newEmail: string) => {
  if (!isEmailLike(newEmail)) throw new SettingsError('invalidDetails');
  return repo.startEmailChange(newEmail.trim());
};

export const makeConfirmEmailChange = (repo: SettingsRepository) => async (code: string) => {
  if (!/^\d{6}$/.test(code)) throw new SettingsError('badCode');
  return repo.confirmEmailChange(code);
};

export const makeReauthenticate = (repo: SettingsRepository) => (password: string) =>
  repo.reauthenticate(password);

export const makeDeleteAccount = (repo: SettingsRepository) => (reason: string) =>
  repo.deleteAccount(reason.trim() ? reason.trim().slice(0, DELETE_REASON_MAX) : null);

export const makeListDrafts = (repo: SettingsRepository) => async () => sortDrafts(await repo.listDrafts());
export const makeDeleteDraft = (repo: SettingsRepository) => (id: string) => repo.deleteDraft(id);

export const makeListBlocked = (repo: SettingsRepository) => () => repo.listBlocked();
export const makeUnblock = (repo: SettingsRepository) => (id: string) => repo.unblock(id);

export const makeGetSupportLinks = (repo: SettingsRepository) => () => repo.getSupportLinks();
