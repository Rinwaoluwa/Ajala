import { pickSquareImage } from '@core/media/imagePicker';

import type { SettingsRequest } from './data/datasources/remote/settingsApi';
import { createSettingsRepository } from './data/repositories/SettingsRepositoryImpl';
import {
  makeChangePassword,
  makeCheckHandle,
  makeConfirmEmailChange,
  makeDeleteAccount,
  makeDeleteDraft,
  makeEndSession,
  makeGetAccount,
  makeGetSettings,
  makeGetSupportLinks,
  makeListBlocked,
  makeListDrafts,
  makeListSessions,
  makeReauthenticate,
  makeSaveProfile,
  makeSearchCities,
  makeStartEmailChange,
  makeUnblock,
  makeUpdateSettings,
  makeUploadAvatar,
} from './domain/usecases/SettingsUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createSettingsUseCases(request: SettingsRequest) {
  const repo = createSettingsRepository(request);
  return {
    getAccount: makeGetAccount(repo),
    saveProfile: makeSaveProfile(repo),
    uploadAvatar: makeUploadAvatar(repo),
    checkHandle: makeCheckHandle(repo),
    searchCities: makeSearchCities(repo),
    getSettings: makeGetSettings(repo),
    updateSettings: makeUpdateSettings(repo),
    listSessions: makeListSessions(repo),
    endSession: makeEndSession(repo),
    changePassword: makeChangePassword(repo),
    startEmailChange: makeStartEmailChange(repo),
    confirmEmailChange: makeConfirmEmailChange(repo),
    reauthenticate: makeReauthenticate(repo),
    deleteAccount: makeDeleteAccount(repo),
    listDrafts: makeListDrafts(repo),
    deleteDraft: makeDeleteDraft(repo),
    listBlocked: makeListBlocked(repo),
    unblock: makeUnblock(repo),
    getSupportLinks: makeGetSupportLinks(repo),
  };
}

export type SettingsUseCases = ReturnType<typeof createSettingsUseCases>;

/** Picking a profile photo: cropped square, resized and compressed for upload (spec §1.4). */
export const settingsMedia = { pickSquareImage };
