/** Why a chat call failed, in the terms the screens act on (from the API's code, never its message). */
export type ChatErrorCode =
  /** Chat is not in the API yet: the proposed endpoint answered 404 / 405. */
  | 'unavailable'
  /** Empty, or longer than `MESSAGE_MAX`. */
  | 'invalid'
  /** Blocked, or not a member of the conversation. */
  | 'notAllowed'
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
