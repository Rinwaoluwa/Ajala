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
  makeGetExport,
  makeGetSettings,
  makeGetSupportLinks,
  makeListBlocked,
  makeListDrafts,
  makeListReports,
  makeListSessions,
  makePopularCities,
  makeReauthenticate,
  makeRequestExport,
  makeSaveProfile,
  makeSearchCities,
  makeSendReauthCode,
  makeSetAnalytics,
  makeSetPassword,
  makeSignOutEverywhere,
  makeStartEmailChange,
  makeUnblock,
  makeUnlinkIdentity,
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
    popularCities: makePopularCities(repo),
    getSettings: makeGetSettings(repo),
    updateSettings: makeUpdateSettings(repo),
    setAnalytics: makeSetAnalytics(repo),
    listSessions: makeListSessions(repo),
    endSession: makeEndSession(repo),
    signOutEverywhere: makeSignOutEverywhere(repo),
    changePassword: makeChangePassword(repo),
    setPassword: makeSetPassword(repo),
    startEmailChange: makeStartEmailChange(repo),
    confirmEmailChange: makeConfirmEmailChange(repo),
    sendReauthCode: makeSendReauthCode(repo),
    reauthenticate: makeReauthenticate(repo),
    unlinkIdentity: makeUnlinkIdentity(repo),
    deleteAccount: makeDeleteAccount(repo),
    requestExport: makeRequestExport(repo),
    getExport: makeGetExport(repo),
    listReports: makeListReports(repo),
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
