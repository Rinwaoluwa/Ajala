import { getClientLocationHeader } from '@core/location/deviceLocation';

import type { PostDetailRepository } from '../../domain/repositories/PostDetailRepository';
import { createPostDetailApi, type PostDetailRequest } from '../datasources/remote/postDetailApi';
import {
  toAttendeesPage,
  toComment,
  toCommentError,
  toCommentsPage,
  toPostDetail,
  toPostDetailError,
  toReportError,
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

  // The same call wrapper with an endpoint's own reading of the codes (see the mappers).
  const as =
    (map: (e: unknown) => Error) =>
    async <T>(call: () => Promise<T>): Promise<T> => {
      try {
        return await call();
      } catch (e) {
        throw map(e);
      }
    };
  const writing = as(toCommentError);
  const reporting = as(toReportError);

  return {
    getComments: (id, cursor, limit) =>
      guard(async () => toCommentsPage(await api.getComments(id, cursor, limit))),
    getReplies: (id, commentId, cursor, limit) =>
      guard(async () => toCommentsPage(await api.getReplies(id, commentId, cursor, limit))),
    addComment: (id, body, parentId) =>
      writing(async () => toComment(await api.addComment(id, parentId ? { body, parentId } : { body }))),
    deleteComment: (id, commentId) => guard(() => api.deleteComment(id, commentId)),
    reportComment: (id, commentId, reason, details) =>
      reporting(async () => {
        await api.reportComment(id, commentId, details ? { reason, details } : { reason });
      }),
    getPost: (id) => guard(async () => toPostDetail(await api.getPost(id, await getClientLocationHeader()))),
    getAttendees: (id, state, cursor, limit) =>
      guard(async () => toAttendeesPage(await api.getAttendees(id, state, cursor, limit))),
    join: (id) => guard(async () => toRsvpResult(await api.join(id))),
    leave: (id) => guard(() => api.leave(id)),
    recordLinkClick: (id) => guard(() => api.linkClick(id)),
    accept: (id, userId) => guard(async () => toRsvpResult(await api.respond(id, userId, 'accept'))),
    decline: (id, userId) => guard(async () => toRsvpResult(await api.respond(id, userId, 'decline'))),
    removeAttendee: (id, userId) => guard(async () => toRsvpResult(await api.respond(id, userId, 'remove'))),
    cancel: (id) => guard(async () => void (await api.cancel(id))),
    remove: (id) => guard(() => api.remove(id)),
    getViewer: () =>
      guard(async () => {
        const me = await api.getMe();
        return {
          id: me.id,
          name: [me.firstName, me.lastName].filter(Boolean).join(' ') || 'You',
          avatarUrl: me.avatarUrl ?? null,
        };
      }),
  };
}
