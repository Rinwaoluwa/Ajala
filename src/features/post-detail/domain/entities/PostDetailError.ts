/** Why a post-page call failed, in the terms the page acts on (by `ErrorResponseDto.code`, spec §5). */
export type PostDetailErrorCode =
  /** 404: a draft, taken down, or the host blocked the viewer. */
  | 'notFound'
  | 'postFull'
  | 'postStarted'
  /** Also what a comment on a cancelled post answers: the composer closes. */
  | 'postCancelled'
  /** Delete refused: people joined. Cancel instead. */
  | 'hasAttendees'
  /** Own post (a 409 on joining it), declined by the host, or a list the viewer may not see. */
  | 'notAllowed'
  /** Empty, or longer than `COMMENT_MAX`. */
  | 'commentInvalid'
  /** A report without a reason, or "other" without details (or one's own comment). */
  | 'reportInvalid'
  /** 409 on a report: one is already open. */
  | 'alreadyReported'
  /** 403 `REPORTING_PAUSED`: a moderator paused this person's reporting. */
  | 'reportingPaused'
  /**
   * 402 `PAYMENT_REQUIRED`: a Plan, or a post outside the reader's area, and
   * they have no Pro (MOB-077). The paywall, never an error screen.
   */
  | 'proRequired'
  /** 400 `NO_LOCATION`: a free member with location off. Ask to turn it on. */
  | 'noLocation'
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
