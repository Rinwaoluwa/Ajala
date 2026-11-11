import { pickImages } from '@core/media/imagePicker';

import { googlePlaceFinder } from './data/datasources/native/placeFinder';
import { devicePlaceLocator } from './data/datasources/native/placeLocator';
import type { PostRequest } from './data/datasources/remote/postApi';
import { createPostRepository } from './data/repositories/PostRepositoryImpl';
import {
  makeListInterests,
  makeLoadDraft,
  makeLocatePlace,
  makePlaceDetails,
  makePublishPost,
  makeSaveChanges,
  makeSaveDraft,
  makeSearchPlaces,
} from './domain/usecases/CreatePostUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer. Place
 * search goes to Google through `@core/places`; a typed meeting point that was
 * not picked from it is found by the phone's own geocoder.
 */
export function createPostUseCases(request: PostRequest) {
  const repo = createPostRepository(request);
  return {
    publish: makePublishPost(repo),
    saveDraft: makeSaveDraft(repo),
    saveChanges: makeSaveChanges(repo),
    locatePlace: makeLocatePlace(devicePlaceLocator),
    listInterests: makeListInterests(repo),
    loadDraft: makeLoadDraft(repo),
    searchPlaces: makeSearchPlaces(googlePlaceFinder),
    placeDetails: makePlaceDetails(googlePlaceFinder),
    endPlaceSearch: () => googlePlaceFinder.endSession(),
  };
}

export type CreatePostUseCases = ReturnType<typeof createPostUseCases>;

/** Adding photos: several at once, resized and compressed for upload (spec §1.4). */
export const postMedia = { pickImages };
