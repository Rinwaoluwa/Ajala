import { localiseImage } from '@core/media/imagePicker';

import { CreatePostError } from '../../domain/entities/CreatePostError';
import type { DraftPhoto } from '../../domain/entities/PostDraft';
import type { PostRepository } from '../../domain/repositories/PostRepository';
import { createPostApi, type PostRequest } from '../datasources/remote/postApi';
import {
  toCreateFields,
  toCreatePostError,
  toDraftCity,
  toInterest,
  toSavedPost,
  toUpdateBody,
  toUploadFiles,
} from '../mappers/postMappers';

/**
 * `PostRepository` over the API. Nothing is cached here: the interests and the
 * city search are cached by the screens' queries.
 */
export function createPostRepository(request: PostRequest): PostRepository {
  const api = createPostApi(request);
  const guard = async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toCreatePostError(e);
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
      guard(async () => (await api.create(toCreateFields(s, status), toUploadFiles(s))).id),
    update: (postId, s) => guard(async () => void (await api.update(postId, toUpdateBody(s)))),
    replaceImages: (postId, photos) =>
      guard(async () => void (await api.replaceImages(postId, await asFiles(photos)))),
    replaceChecklist: (postId, lines) => guard(async () => void (await api.replaceChecklist(postId, lines))),
    publish: (postId) => guard(async () => void (await api.publish(postId))),
    listInterests: () => guard(async () => (await api.listInterests()).map(toInterest)),
    searchCities: (query, limit) =>
      guard(async () => (await api.searchCities(query, limit)).map(toDraftCity)),
  };
}
