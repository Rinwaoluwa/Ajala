/** Why a post-page call failed, in the terms the page acts on (by `ErrorResponseDto.code`, spec §5). */
export type PostDetailErrorCode =
  /** 404: a draft, taken down, or the host blocked the viewer. */
  | 'notFound'
  | 'postFull'
  | 'postStarted'
  /** Also what a comment on a cancelled post answers: the composer closes. */
  | 'postCancelled'
  /** A paid Event: book through its link instead. */
  | 'externalBooking'
  /** Delete refused: people joined. Cancel instead. */
  | 'hasAttendees'
  /** Own post, declined by the host, or a list the viewer may not see. */
  | 'notAllowed'
  /** Empty, or longer than `COMMENT_MAX`. */
  | 'commentInvalid'
  /** A report without a reason, or "other" without details (or one's own comment). */
  | 'reportInvalid'
  /** 409 on a report: one is already open. */
  | 'alreadyReported'
  /** 403 `REPORTING_PAUSED`: a moderator paused this person's reporting. */
  | 'reportingPaused'
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
