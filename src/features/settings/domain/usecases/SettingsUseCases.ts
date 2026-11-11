import { SettingsError } from '../entities/SettingsError';
import type { Account, LinkedProvider, ProfileEdit, ReauthProof, SettingsPatch } from '../entities/Settings';
import type { SettingsRepository } from '../repositories/SettingsRepository';
import {
  BIO_MAX,
  DELETE_REASON_MAX,
  FAVOURITE_DESTINATIONS_MAX,
  INTERESTS_MAX,
  INTERESTS_MIN,
  PHOTOS_MAX,
  TRAVEL_STYLES_MAX,
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
    if ((edit.travelStyles?.length ?? 0) > TRAVEL_STYLES_MAX) throw new SettingsError('invalidDetails');
    if ((edit.favouriteDestinationIds?.length ?? 0) > FAVOURITE_DESTINATIONS_MAX)
      throw new SettingsError('invalidDetails');
    // The API takes 3–8 interests; an empty set means "leave them alone", not "clear them".
    if (edit.interestIds && edit.interestIds.length === 0) delete edit.interestIds;
    if (edit.interestIds && (edit.interestIds.length < INTERESTS_MIN || edit.interestIds.length > INTERESTS_MAX))
      throw new SettingsError('invalidDetails');
    if (Object.keys(edit).length === 0) return account;
    return repo.updateAccount(edit, account);
  };

export const makeUploadAvatar =
  (repo: SettingsRepository) => (file: { uri: string; name: string; type: string }) =>
    repo.uploadAvatar(file);

/** A gallery photo; a full gallery is refused before a request is spent. */
export const makeAddPhoto =
  (repo: SettingsRepository) => async (file: { uri: string; name: string; type: string }, current: Account) => {
    if (current.photos.length >= PHOTOS_MAX) throw new SettingsError('galleryFull');
    return repo.addPhoto(file);
  };
export const makeRemovePhoto = (repo: SettingsRepository) => (photoId: string) => repo.removePhoto(photoId);
export const makeReorderPhotos = (repo: SettingsRepository) => (ids: string[]) => repo.reorderPhotos(ids);
export const makeListInterests = (repo: SettingsRepository) => () => repo.listInterests();

/** Format first (no request for "a!"), then the server. */
export const makeCheckHandle = (repo: SettingsRepository) => async (raw: string) => {
  const handle = normaliseHandle(raw);
  if (!isHandleFormatValid(handle)) return { available: false, reason: 'format' as const };
  return repo.checkHandle(handle);
};

/**
 * Google cities search (the API has none): from two characters, since each
 * request is billed and one letter matches too much. A cancelled `signal`
 * rejects with its own abort.
 */
export const makeSearchCities =
  (repo: SettingsRepository) =>
  async (query: string, signal?: AbortSignal) => {
    const q = query.trim();
    return q.length < 2 ? [] : (await repo.searchCities(q, signal)).slice(0, 10);
  };

export const makeEndCitySearch = (repo: SettingsRepository) => () => repo.endCitySearch();
export const makeDetectCurrentCity = (repo: SettingsRepository) => () => repo.detectCurrentCity();

export const makeGetSettings = (repo: SettingsRepository) => () => repo.getSettings();
export const makeUpdateSettings = (repo: SettingsRepository) => (patch: SettingsPatch) =>
  repo.updateSettings(patch);
/** Usage analytics on (true) or off; stored as `analyticsOptOut`, the other way round. */
export const makeSetAnalytics = (repo: SettingsRepository) => (enabled: boolean) =>
  repo.setAnalytics(enabled);

export const makeListSessions = (repo: SettingsRepository) => async () =>
  sortSessions(await repo.listSessions());
export const makeEndSession = (repo: SettingsRepository) => (id: string) => repo.endSession(id);
export const makeSignOutEverywhere = (repo: SettingsRepository) => () => repo.signOutEverywhere();

export const makeChangePassword =
  (repo: SettingsRepository) => async (currentPassword: string, newPassword: string) => {
    if (!currentPassword || !isPasswordValid(newPassword)) throw new SettingsError('invalidDetails');
    return repo.changePassword(currentPassword, newPassword);
  };

export const makeSetPassword = (repo: SettingsRepository) => async (newPassword: string) => {
  if (!isPasswordValid(newPassword)) throw new SettingsError('invalidDetails');
  return repo.setPassword(newPassword);
};

export const makeStartEmailChange = (repo: SettingsRepository) => async (newEmail: string) => {
  if (!isEmailLike(newEmail)) throw new SettingsError('invalidDetails');
  return repo.startEmailChange(newEmail.trim());
};

export const makeConfirmEmailChange = (repo: SettingsRepository) => async (code: string) => {
  if (!/^\d{6}$/.test(code)) throw new SettingsError('badCode');
  return repo.confirmEmailChange(code);
};

export const makeSendReauthCode = (repo: SettingsRepository) => () => repo.sendReauthCode();

/** A code that is not six digits is wrong without asking; an empty password is never sent. */
export const makeReauthenticate = (repo: SettingsRepository) => async (proof: ReauthProof) => {
  if ('code' in proof && !/^\d{6}$/.test(proof.code)) throw new SettingsError('badCode');
  if ('password' in proof && !proof.password) throw new SettingsError('wrongPassword');
  return repo.reauthenticate(proof);
};

export const makeUnlinkIdentity = (repo: SettingsRepository) => (provider: LinkedProvider) =>
  repo.unlinkIdentity(provider);

export const makeDeleteAccount = (repo: SettingsRepository) => (reason: string) =>
  repo.deleteAccount(reason.trim() ? reason.trim().slice(0, DELETE_REASON_MAX) : null);

export const makeRequestExport = (repo: SettingsRepository) => () => repo.requestExport();
export const makeGetExport = (repo: SettingsRepository) => () => repo.getExport();

export const makeListReports = (repo: SettingsRepository) => (cursor: string | null) =>
  repo.listReports(cursor);

export const makeListDrafts = (repo: SettingsRepository) => async () => sortDrafts(await repo.listDrafts());
export const makeDeleteDraft = (repo: SettingsRepository) => (id: string) => repo.deleteDraft(id);

export const makeListBlocked = (repo: SettingsRepository) => () => repo.listBlocked();
export const makeUnblock = (repo: SettingsRepository) => (id: string) => repo.unblock(id);

export const makeGetSupportLinks = (repo: SettingsRepository) => () => repo.getSupportLinks();
