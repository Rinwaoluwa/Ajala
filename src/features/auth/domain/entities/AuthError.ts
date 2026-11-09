import type { SignInMethod } from './Account';

/**
 * Failures the auth flows know how to explain. A repository maps whatever its
 * backend returns onto one of these, so presentation never parses a server message.
 */
export type AuthErrorCode =
  | 'invalidCode'
  /**
   * The code, or the reset token a code bought, ran out or was already used.
   * Only a new code fixes it.
   */
  | 'expiredCode'
  /**
   * Too many wrong tries: the API burns a password-reset code on the fifth
   * wrong one, so even the right code will now fail. Only a new code fixes it.
   */
  | 'codeUsedUp'
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
   * A Google or Apple sign-in found an account with that email which signs in
   * another way. The API never joins the two (and sends no email), so the only
   * way in is the way that account already uses: `signInMethods` lists them.
   */
  | 'emailAlreadyRegistered'
  /** Google or Apple handed over a token the API would not accept. */
  | 'providerRejected'
  /** The provider cannot be used here: Apple on Android, or Google not set up. */
  | 'providerUnavailable'
  /** The person closed the provider's sheet. Not an error to show. */
  | 'cancelled'
  /** The stored session is gone and cannot be refreshed; sign in again. */
  | 'sessionExpired'
  /**
   * The API will not create an account from these details, and does not say
   * why. Kept vague on purpose; nothing the person retypes will change it.
   */
  | 'signUpRefused'
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
  /**
   * Set with `emailAlreadyRegistered`: the ways into the account that owns the
   * email. Empty when the API named none, or for any other code.
   */
  readonly signInMethods: SignInMethod[];
  /** Set with `rateLimited` when the server said how long to wait, in seconds. */
  readonly retryAfterSeconds: number | null;

  constructor(
    code: AuthErrorCode,
    message?: string,
    fieldErrors: AuthFieldError[] = [],
    signInMethods: SignInMethod[] = [],
    retryAfterSeconds: number | null = null,
  ) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.signInMethods = signInMethods;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const isAuthError = (e: unknown): e is AuthError => e instanceof AuthError;
