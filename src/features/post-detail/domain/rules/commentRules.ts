import type { PostComment, PostDetail } from '../entities/PostDetail';

/**
 * How comments behave on the page (spec §2.18), apart from React so they can
 * be tested on their own.
 */

/** The top-level comment a reply goes under: replying to a reply joins the same thread. */
export const threadOf = (comment: Pick<PostComment, 'id' | 'parentId'>) => comment.parentId ?? comment.id;

/**
 * A deleted top-level comment that still has replies stays in the list as
 * "Comment deleted", so the replies keep their place; anything else just goes.
 */
export const leavesTombstone = (comment: Pick<PostComment, 'parentId' | 'replyCount'>) =>
  comment.parentId === null && comment.replyCount > 0;

/** What a comment looks like once deleted but kept for its replies (as the API sends it). */
export const tombstoneOf = (comment: PostComment): PostComment => ({
  ...comment,
  deleted: true,
  author: null,
  body: null,
  mine: false,
  canDelete: false,
});

/** Report is for other people's live comments; one's own can only be deleted. */
export const canReport = (comment: PostComment) => !comment.mine && !comment.deleted && !comment.pending;

/** A cancelled post takes no new comments (409 `POST_CANCELLED`), so the composer closes up front. */
export const commentsClosed = (post: Pick<PostDetail, 'status'> | null) => post?.status === 'cancelled';
