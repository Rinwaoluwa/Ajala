/** Why the inbox could not load or be marked read, by the API's code (spec §5). */
export type NotificationsErrorCode = 'network' | 'sessionExpired' | 'unknown';

export class NotificationsError extends Error {
  readonly code: NotificationsErrorCode;
  constructor(code: NotificationsErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'NotificationsError';
    this.code = code;
  }
}

export const isNotificationsError = (e: unknown): e is NotificationsError => e instanceof NotificationsError;
