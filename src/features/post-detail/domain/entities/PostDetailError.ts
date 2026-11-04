/** Why a post-page call failed, in the terms the page acts on (by `ErrorResponseDto.code`, spec §5). */
export type PostDetailErrorCode =
  /** 404: a draft, taken down, or the host blocked the viewer. */
  | 'notFound'
  | 'postFull'
  | 'postStarted'
  | 'postCancelled'
  /** A paid Event: book through its link instead. */
  | 'externalBooking'
  /** Delete refused: people joined. Cancel instead. */
  | 'hasAttendees'
  /** Own post, declined by the host, or a list the viewer may not see. */
  | 'notAllowed'
  /** Comments are not in the API yet (the proposed endpoint answered 404 / 405). */
  | 'commentsUnavailable'
  /** Empty, or longer than `COMMENT_MAX`. */
  | 'commentInvalid'
  | 'rateLimited'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class PostDetailError extends Error {
  readonly code: PostDetailErrorCode;
  constructor(code: PostDetailErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PostDetailError';
    this.code = code;
  }
}

export const isPostDetailError = (e: unknown): e is PostDetailError => e instanceof PostDetailError;
