import { PostDetailError } from '../entities/PostDetailError';
import type { AttendeeState } from '../entities/PostDetail';
import type { PostDetailRepository } from '../repositories/PostDetailRepository';

export const ATTENDEES_PAGE_SIZE = 20;

export const makeGetPost = (repo: PostDetailRepository) => (postId: string) => repo.getPost(postId);

export const makeGetAttendees =
  (repo: PostDetailRepository) =>
  (postId: string, state: AttendeeState, cursor: string | null = null) =>
    repo.getAttendees(postId, state, cursor, ATTENDEES_PAGE_SIZE);

export const makeJoin = (repo: PostDetailRepository) => (postId: string) => repo.join(postId);
export const makeLeave = (repo: PostDetailRepository) => (postId: string) => repo.leave(postId);

/** Opening the link is the screen's; counting it is best effort and never blocks the person. */
export const makeRecordLinkClick = (repo: PostDetailRepository) => (postId: string) =>
  repo.recordLinkClick(postId).catch(() => undefined);

export const makeRespondToRequest =
  (repo: PostDetailRepository) => (postId: string, userId: string, answer: 'accept' | 'decline') =>
    answer === 'accept' ? repo.accept(postId, userId) : repo.decline(postId, userId);

export const makeCancelPost = (repo: PostDetailRepository) => (postId: string) => repo.cancel(postId);
export const makeDeletePost = (repo: PostDetailRepository) => (postId: string) => repo.remove(postId);

export const makeGetViewer = (repo: PostDetailRepository) => () => repo.getViewer();

export const COMMENT_MAX = 500;
export const COMMENTS_PAGE = 20;

export const makeGetComments =
  (repo: PostDetailRepository) =>
  (postId: string, cursor: string | null = null) =>
    repo.getComments(postId, cursor, COMMENTS_PAGE);

/** Trimmed, 1–500 characters; anything else is refused before it is sent. */
export const makeAddComment =
  (repo: PostDetailRepository) =>
  async (postId: string, text: string, replyToId: string | null = null) => {
    const body = text.trim();
    if (!body || body.length > COMMENT_MAX) throw new PostDetailError('commentInvalid');
    return repo.addComment(postId, body, replyToId);
  };
