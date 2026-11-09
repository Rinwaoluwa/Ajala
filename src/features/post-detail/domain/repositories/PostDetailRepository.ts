import type {
  AttendeeState,
  AttendeesPage,
  CommentsPage,
  PostComment,
  PostDetail,
  ReportReason,
  RsvpResult,
  Viewer,
} from '../entities/PostDetail';

/** The post page's calls (API map §6). Every method throws `PostDetailError`. */
export interface PostDetailRepository {
  getPost(postId: string): Promise<PostDetail>;
  getAttendees(
    postId: string,
    state: AttendeeState,
    cursor: string | null,
    limit: number,
  ): Promise<AttendeesPage>;
  join(postId: string): Promise<RsvpResult>;
  leave(postId: string): Promise<void>;
  /** Counts one click on the post's link for the host. */
  recordLinkClick(postId: string): Promise<void>;
  accept(postId: string, userId: string): Promise<RsvpResult>;
  decline(postId: string, userId: string): Promise<RsvpResult>;
  /**
   * `POST /posts/:id/attendees/:userId/remove`: the host takes someone going or
   * on the waitlist off the post, for good; a spot they held goes to the next
   * person waiting. Answers with the count after.
   */
  removeAttendee(postId: string, userId: string): Promise<RsvpResult>;
  cancel(postId: string): Promise<void>;
  remove(postId: string): Promise<void>;
  /** `GET /me`, for the comment bar's avatar. */
  getViewer(): Promise<Viewer>;
  /** Top-level comments, oldest first, with `total` for the header (`GET /posts/:id/comments`). */
  getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage>;
  /** One comment's replies, oldest first (`GET /posts/:id/comments/:commentId/replies`). */
  getReplies(postId: string, commentId: string, cursor: string | null, limit: number): Promise<CommentsPage>;
  /** `POST /posts/:id/comments { body, parentId? }`; a reply to a reply joins the same top-level one. */
  addComment(postId: string, body: string, parentId: string | null): Promise<PostComment>;
  /** `DELETE /posts/:id/comments/:commentId` (idempotent). */
  deleteComment(postId: string, commentId: string): Promise<void>;
  /** `POST /posts/:id/comments/:commentId/report { reason, details? }`. */
  reportComment(postId: string, commentId: string, reason: ReportReason, details: string | null): Promise<void>;
}
