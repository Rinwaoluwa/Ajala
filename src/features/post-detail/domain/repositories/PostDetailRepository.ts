import type {
  AttendeeState,
  AttendeesPage,
  CommentsPage,
  PostComment,
  PostDetail,
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
  /** Counts one click on the pay-or-book link for the host. */
  recordLinkClick(postId: string): Promise<void>;
  accept(postId: string, userId: string): Promise<RsvpResult>;
  decline(postId: string, userId: string): Promise<RsvpResult>;
  cancel(postId: string): Promise<void>;
  remove(postId: string): Promise<void>;
  /** `GET /me`, for the comment bar's avatar. */
  getViewer(): Promise<Viewer>;
  /** Comments, oldest first (proposed `GET /posts/:id/comments`). */
  getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage>;
  /** Proposed `POST /posts/:id/comments { text, replyToId? }`. */
  addComment(postId: string, text: string, replyToId: string | null): Promise<PostComment>;
}
