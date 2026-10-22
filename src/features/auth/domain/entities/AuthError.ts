/**
 * Failures the auth flows know how to explain. A repository maps whatever its
 * backend returns onto one of these, so presentation never parses a server message.
 */
export type AuthErrorCode =
  | 'invalidCode'
  | 'expiredCode'
  | 'invalidCredentials'
  | 'invalidDetails'
  /** The account exists but its address has not been confirmed; a code was re-sent. */
  | 'emailNotVerified'
  /**
   * Credentials were right, but the server wants an emailed code as well —
   * a new device, usually. Answered by retrying sign-in with `otpCode`, NOT by
   * the email-verification endpoint, which is a different challenge entirely.
   */
  | 'stepUpRequired'
  /**
   * A Google or Apple sign-in matched an account that already exists. The API
   * emailed that account a code; `challengeId` says which link it confirms.
   */
  | 'accountLinkRequired'
  /**
   * Finishing an account link failed. A wrong, expired or used code and an
   * unknown challenge all look the same, and the challenge is one-use, so the
   * only way on is to start again from the provider.
   */
  | 'linkFailed'
  /** Google or Apple handed over a token the API would not accept. */
  | 'providerRejected'
  /** The provider cannot be used here: Apple on Android, or Google not set up. */
  | 'providerUnavailable'
  /** The person closed the provider's sheet. Not an error to show. */
  | 'cancelled'
  /** The stored session is gone and cannot be refreshed; sign in again. */
  | 'sessionExpired'
  /** The API refused the password because it appears in a known breach. */
  | 'passwordBreached'
  /**
   * The terms version sent is no longer the one in force — they changed while
   * the app was open. Answered by fetching the current version and trying again.
   */
  | 'termsOutdated'
  /** Too many attempts. Backing off is the only fix. */
  | 'rateLimited'
  | 'network'
  | 'unknown';

/**
 * Which submitted value the server objected to. `field` is the name the API uses
 * (`lastName`, `dob`), which the screen maps onto whatever it calls that input.
 */
export type AuthFieldError = { field: string; message: string };

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  /**
   * Set when the server said which values were wrong. Without these a validation
   * failure can only be reported as "something is wrong somewhere", which tells
   * the person nothing about what to change.
   */
  readonly fieldErrors: AuthFieldError[];
  /** Set with `accountLinkRequired`: the challenge the emailed code answers. */
  readonly challengeId: string | null;
  /** Set with `rateLimited` when the server said how long to wait, in seconds. */
  readonly retryAfterSeconds: number | null;

  constructor(
    code: AuthErrorCode,
    message?: string,
    fieldErrors: AuthFieldError[] = [],
    challengeId: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.challengeId = challengeId;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const isAuthError = (e: unknown): e is AuthError => e instanceof AuthError;
