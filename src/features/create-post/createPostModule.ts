import { pickImages } from '@core/media/imagePicker';

import { devicePlaceLocator } from './data/datasources/native/placeLocator';
import type { PostRequest } from './data/datasources/remote/postApi';
import { createPostRepository } from './data/repositories/PostRepositoryImpl';
import {
  makeListInterests,
  makeLoadDraft,
  makeLocatePlace,
  makePublishPost,
  makeSaveDraft,
  makeSearchCities,
} from './domain/usecases/CreatePostUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createPostUseCases(request: PostRequest) {
  const repo = createPostRepository(request);
  return {
    publish: makePublishPost(repo),
    saveDraft: makeSaveDraft(repo),
    locatePlace: makeLocatePlace(devicePlaceLocator),
    listInterests: makeListInterests(repo),
    loadDraft: makeLoadDraft(repo),
    searchCities: makeSearchCities(repo),
  };
}

export type CreatePostUseCases = ReturnType<typeof createPostUseCases>;

/** Adding photos: several at once, resized and compressed for upload (spec §1.4). */
export const postMedia = { pickImages };
