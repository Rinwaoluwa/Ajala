import { pickImages, pickSquareImage } from '@core/media/imagePicker';

import type { SettingsRequest } from './data/datasources/remote/settingsApi';
import { createSettingsRepository } from './data/repositories/SettingsRepositoryImpl';
import {
  makeAddPhoto,
  makeChangePassword,
  makeCheckHandle,
  makeConfirmEmailChange,
  makeDeleteAccount,
  makeDeleteDraft,
  makeDetectCurrentCity,
  makeEndCitySearch,
  makeEndSession,
  makeGetAccount,
  makeGetExport,
  makeGetSettings,
  makeGetSupportLinks,
  makeListBlocked,
  makeListDrafts,
  makeListInterests,
  makeListReports,
  makeListSessions,
  makeReauthenticate,
  makeRemovePhoto,
  makeReorderPhotos,
  makeRequestExport,
  makeSaveProfile,
  makeSearchCities,
  makeSearchDestinations,
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
    addPhoto: makeAddPhoto(repo),
    removePhoto: makeRemovePhoto(repo),
    reorderPhotos: makeReorderPhotos(repo),
    listInterests: makeListInterests(repo),
    checkHandle: makeCheckHandle(repo),
    searchCities: makeSearchCities(repo),
    searchDestinations: makeSearchDestinations(repo),
    endCitySearch: makeEndCitySearch(repo),
    detectCurrentCity: makeDetectCurrentCity(repo),
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

/**
 * Picking a profile photo (cropped square) and gallery photos (their own shape),
 * each resized and compressed for upload (spec §1.4).
 */
export const settingsMedia = { pickSquareImage, pickImages };
