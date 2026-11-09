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
  /** Starting: a chat with yourself. Members: not going, full, or the host leaving. */
  | 'conflict'
  /**
   * Opening a post's group chat: you are going, but its 100 places are taken and
   * you are in line for the next one (409 `GROUP_CHAT_FULL`). Not a failure.
   */
  | 'groupChatFull'
  /**
   * The conversation, person or post is not there for you: you left or were
   * removed, or the post was cancelled or deleted (which removes its chat).
   */
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
