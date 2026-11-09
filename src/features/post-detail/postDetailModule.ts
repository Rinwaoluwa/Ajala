import type { PostDetailRequest } from './data/datasources/remote/postDetailApi';
import { createPostDetailRepository } from './data/repositories/PostDetailRepositoryImpl';
import {
  makeAddComment,
  makeCancelPost,
  makeDeleteComment,
  makeDeletePost,
  makeGetAttendees,
  makeGetComments,
  makeGetPost,
  makeGetReplies,
  makeGetViewer,
  makeJoin,
  makeLeave,
  makeRecordLinkClick,
  makeReportComment,
  makeRemoveAttendee,
  makeRespondToRequest,
} from './domain/usecases/PostDetailUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createPostDetailUseCases(request: PostDetailRequest) {
  const repo = createPostDetailRepository(request);
  return {
    getPost: makeGetPost(repo),
    getAttendees: makeGetAttendees(repo),
    join: makeJoin(repo),
    leave: makeLeave(repo),
    recordLinkClick: makeRecordLinkClick(repo),
    respondToRequest: makeRespondToRequest(repo),
    removeAttendee: makeRemoveAttendee(repo),
    cancelPost: makeCancelPost(repo),
    deletePost: makeDeletePost(repo),
    getViewer: makeGetViewer(repo),
    getComments: makeGetComments(repo),
    getReplies: makeGetReplies(repo),
    addComment: makeAddComment(repo),
    deleteComment: makeDeleteComment(repo),
    reportComment: makeReportComment(repo),
  };
}

export type PostDetailUseCases = ReturnType<typeof createPostDetailUseCases>;
