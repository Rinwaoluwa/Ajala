import { pickSquareImage } from '@core/media/imagePicker';

import { createProfileRepository } from './data/repositories/ProfileRepositoryImpl';
import type { ProfileRequest } from './data/datasources/remote/profileApi';
import {
  makeCheckHandle,
  makeChooseHandle,
  makeDetectHomeCity,
  makeGetMyProfile,
  makeListInterests,
  makeRemoveAvatar,
  makeSaveSetup,
  makeSearchCities,
  makeUploadAvatar,
} from './domain/usecases/ProfileSetupUseCases';

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
    listInterests: makeListInterests(repo),
  };
}

export type ProfileUseCases = ReturnType<typeof createProfileUseCases>;

/** Picking a profile photo: cropped square, resized and compressed for upload (§1.4). */
export const profileMedia = { pickSquareImage };
