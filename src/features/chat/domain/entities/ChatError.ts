/**
 * Why a chat call failed, in the terms the screens act on. Read from the API's
 * code (never its message), and per call: the same 403 means different things
 * when starting a chat and when sending in one.
 */
export type ChatErrorCode =
  /** Empty, too long, or too many pictures. */
  | 'invalid'
  /** Sending: the other person can no longer be messaged (blocked, left, account gone). */
  | 'notAllowed'
  /** Starting: they only take messages from people they share a post with (`dmPermission: shared_only`). */
  | 'dmRestricted'
  /** Starting: too many new chats today (429 `CHAT_START_LIMIT`). */
  | 'startLimit'
  /** Starting: yourself, a post that isn't live, or a group over 50. Members: not going, full, or the host leaving. */
  | 'conflict'
  /** The conversation, person or post is not there (or not visible to you). */
  | 'notFound'
  /** A picture over 5 MB. */
  | 'tooLarge'
  /** A picture that isn't JPEG, PNG or WebP. */
  | 'unsupportedImage'
  /** Reporting: a moderator paused it for this account. */
  | 'reportingPaused'
  /** Reporting: already reported. */
  | 'alreadyReported'
  | 'rateLimited'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class ChatError extends Error {
  readonly code: ChatErrorCode;
  constructor(code: ChatErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ChatError';
    this.code = code;
  }
}

export const isChatError = (e: unknown): e is ChatError => e instanceof ChatError;
