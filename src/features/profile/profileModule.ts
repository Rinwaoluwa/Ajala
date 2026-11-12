import { pickSquareImage } from '@core/media/imagePicker';

import { createProfileRepository } from './data/repositories/ProfileRepositoryImpl';
import { createProfileViewRepository } from './data/repositories/ProfileViewRepositoryImpl';
import type { ProfileRequest } from './data/datasources/remote/profileApi';
import {
  makeCheckHandle,
  makeChooseHandle,
  makeDetectHomeCity,
  makeEndCitySearch,
  makeGetMyProfile,
  makeListInterests,
  makeRemoveAvatar,
  makeSaveSetup,
  makeSearchCities,
  makeSearchDestinations,
  makeUploadAvatar,
} from './domain/usecases/ProfileSetupUseCases';
import {
  makeBlockPerson,
  makeGetPerson,
  makeLoadMyHistory,
  makeLoadMyRsvps,
  makeLoadPersonActivity,
  makeLoadPersonHistory,
  makeLoadSaved,
  makeReportPerson,
  makeUnblockPerson,
} from './domain/usecases/ProfileViewUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer so this
 * feature never reaches into auth's internals.
 */
export function createProfileUseCases(request: ProfileRequest) {
  const repo = createProfileRepository(request);
  return {
    getMyProfile: makeGetMyProfile(repo),
    saveSetup: makeSaveSetup(repo),
    checkHandle: makeCheckHandle(repo),
    chooseHandle: makeChooseHandle(repo),
    uploadAvatar: makeUploadAvatar(repo),
    removeAvatar: makeRemoveAvatar(repo),
    detectHomeCity: makeDetectHomeCity(repo),
    searchCities: makeSearchCities(repo),
    searchDestinations: makeSearchDestinations(repo),
    listInterests: makeListInterests(repo),
    endCitySearch: makeEndCitySearch(repo),
  };
}

export type ProfileUseCases = ReturnType<typeof createProfileUseCases>;

/**
 * The profile pages (own, other people's, saved, achievements): `GET /users/…`,
 * `/me/attended`, `/me/saved`, `/me/rsvps`.
 */
export function createProfileViewUseCases(request: ProfileRequest) {
  const repo = createProfileViewRepository(request);
  return {
    loadMyHistory: makeLoadMyHistory(repo),
    loadSaved: makeLoadSaved(repo),
    loadMyRsvps: makeLoadMyRsvps(repo),
    loadPersonHistory: makeLoadPersonHistory(repo),
    getPerson: makeGetPerson(repo),
    loadPersonActivity: makeLoadPersonActivity(repo),
    blockPerson: makeBlockPerson(repo),
    unblockPerson: makeUnblockPerson(repo),
    reportPerson: makeReportPerson(repo),
  };
}

export type ProfileViewUseCases = ReturnType<typeof createProfileViewUseCases>;

/** Picking a profile photo: cropped square, resized and compressed for upload (§1.4). */
export const profileMedia = { pickSquareImage };
