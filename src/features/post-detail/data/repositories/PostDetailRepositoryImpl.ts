import { getClientLocationHeader } from '@core/location/deviceLocation';

import type { PostDetailRepository } from '../../domain/repositories/PostDetailRepository';
import { createPostDetailApi, type PostDetailRequest } from '../datasources/remote/postDetailApi';
import {
  toAttendeesPage,
  toComment,
  toCommentsError,
  toCommentsPage,
  toPostDetail,
  toPostDetailError,
  toRsvpResult,
} from '../mappers/postDetailMappers';

/** `PostDetailRepository` over the API. Nothing is cached here; the screens' queries do that. */
export function createPostDetailRepository(request: PostDetailRequest): PostDetailRepository {
  const api = createPostDetailApi(request);
  const guard = async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toPostDetailError(e);
    }
  };

  const comments = async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toCommentsError(e);
    }
  };

  return {
    getComments: (id, cursor, limit) =>
      comments(async () => toCommentsPage(await api.getComments(id, cursor, limit))),
    addComment: (id, text, replyToId) =>
      comments(async () => toComment(await api.addComment(id, text, replyToId))),
    getPost: (id) => guard(async () => toPostDetail(await api.getPost(id, await getClientLocationHeader()))),
    getAttendees: (id, state, cursor, limit) =>
      guard(async () => toAttendeesPage(await api.getAttendees(id, state, cursor, limit))),
    join: (id) => guard(async () => toRsvpResult(await api.join(id))),
    leave: (id) => guard(() => api.leave(id)),
    recordLinkClick: (id) => guard(() => api.linkClick(id)),
    accept: (id, userId) => guard(async () => toRsvpResult(await api.respond(id, userId, 'accept'))),
    decline: (id, userId) => guard(async () => toRsvpResult(await api.respond(id, userId, 'decline'))),
    cancel: (id) => guard(async () => void (await api.cancel(id))),
    remove: (id) => guard(() => api.remove(id)),
    getViewer: () =>
      guard(async () => {
        const me = await api.getMe();
        return {
          name: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'You',
          avatarUrl: me.avatarUrl ?? null,
        };
      }),
  };
}
