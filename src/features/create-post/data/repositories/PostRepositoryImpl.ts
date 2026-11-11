import { localiseImage } from '@core/media/imagePicker';

import { CreatePostError } from '../../domain/entities/CreatePostError';
import type { DraftPhoto } from '../../domain/entities/PostDraft';
import type { PostRepository } from '../../domain/repositories/PostRepository';
import { createPostApi, type PostRequest } from '../datasources/remote/postApi';
import {
  toCreateFields,
  toCreatePostError,
  toInterest,
  toSavedPost,
  toUpdateBody,
  toUploadFiles,
} from '../mappers/postMappers';

/**
 * `PostRepository` over the API. Nothing is cached here: the interests are
 * cached by the screens' queries. Place search is not the API's (see
 * `placeFinder`).
 */
export function createPostRepository(request: PostRequest): PostRepository {
  const api = createPostApi(request);
  const guard = async <T>(call: () => Promise<T>, creatingDraft = false): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toCreatePostError(e, creatingDraft);
    }
  };

  /**
   * The carousel is sent whole, so a resumed draft's photos that are only on the
   * web are copied to the phone first. One that cannot be fetched stops the
   * upload rather than silently dropping out of the carousel.
   */
  const asFiles = async (photos: DraftPhoto[]) =>
    Promise.all(
      photos.map(async (p) => {
        if (!/^https?:\/\//i.test(p.uri)) return p;
        const local = await localiseImage(p.uri);
        if (!local) throw new CreatePostError('network');
        return { ...p, uri: local.uri };
      }),
    );

  return {
    getPost: (postId) => guard(async () => toSavedPost(await api.getPost(postId))),
    create: (s, status) =>
      guard(async () => (await api.create(toCreateFields(s, status), toUploadFiles(s))).id, status === 'draft'),
    update: (postId, s, options) =>
      guard(async () => void (await api.update(postId, toUpdateBody(s, options?.live ?? false)))),
    replaceImages: (postId, photos) =>
      guard(async () => void (await api.replaceImages(postId, await asFiles(photos)))),
    publish: (postId) => guard(async () => void (await api.publish(postId))),
    listInterests: () => guard(async () => (await api.listInterests()).map(toInterest)),
  };
}
