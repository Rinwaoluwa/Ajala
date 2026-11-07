import { isApiError, type ApiError, type ApiErrorCode } from '@core/api/ApiError';

import { AuthError, type AuthErrorCode } from '../../domain/entities/AuthError';

/**
 * `ApiError` → `AuthError`: the API's codes, mapped to what the app can say to
 * someone. Branches on `code` only, never on `message` — the API's own contract
 * says so, and its messages are worded for developers and may change.
 *
 * The same code means different things from different endpoints (a 401 from
 * login is a wrong password, from the reset an expired reset token), so each call site in
 * `AuthRepositoryImpl` passes its own overrides; this table is only the default.
 */

const ERROR_BY_API_CODE: Partial<Record<ApiErrorCode, AuthErrorCode>> = {
  UNAUTHORIZED: 'invalidCredentials',
  EMAIL_NOT_VERIFIED: 'emailNotVerified',
  STEP_UP_REQUIRED: 'stepUpRequired',
  ACCOUNT_LINK_REQUIRED: 'accountLinkRequired',
  PASSWORD_BREACHED: 'passwordBreached',
  // In the API's error list, but no endpoint documents which call returns it
  // (spec §8). Mapped here so whichever does gets the right words.
  SIGNUP_REFUSED: 'signUpRefused',
  VALIDATION_FAILED: 'invalidDetails',
  BAD_REQUEST: 'invalidDetails',
  UNPROCESSABLE: 'invalidDetails',
  // Deliberately NOT "email taken". Sign-up answers 202 whether or not the
  // address has an account (spec §2.2), so that no screen can be used to find out
  // who is registered. A 409 from an auth call is unexpected and reads as one.
  CONFLICT: 'unknown',
  RATE_LIMITED: 'rateLimited',
  NETWORK: 'network',
  TIMEOUT: 'network',
  SERVICE_UNAVAILABLE: 'network',
};

export type AuthErrorOverrides = Partial<Record<ApiErrorCode, AuthErrorCode>>;

/** Calls that carry an access token: a 401 means the token, never the person's input. */
export const SESSION_CALL: AuthErrorOverrides = { UNAUTHORIZED: 'sessionExpired' };

/** Google and Apple: a 401 means the provider's token was refused, replayed, or the account is suspended. */
export const PROVIDER_CALL: AuthErrorOverrides = { UNAUTHORIZED: 'providerRejected' };

/** Whether every field the API complained about is one of `fields`. */
export function onlyAbout(e: ApiError, ...fields: string[]): boolean {
  return e.fieldErrors.length > 0 && e.fieldErrors.every((f) => fields.includes(f.field));
}

export function toAuthError(e: unknown, overrides: AuthErrorOverrides = {}): AuthError {
  // Already ours: the native identity sources throw AuthErrors directly.
  if (e instanceof AuthError) return e;
  if (!isApiError(e)) return new AuthError('unknown');
  const code = overrides[e.code] ?? ERROR_BY_API_CODE[e.code] ?? 'unknown';
  const challengeId = typeof e.details?.challengeId === 'string' ? e.details.challengeId : null;
  // The message is kept for logs. The field errors are carried because a screen
  // can put them against the input they belong to, which a generic code cannot.
  return new AuthError(code, e.message, e.fieldErrors, challengeId, e.retryAfterSeconds);
}

/**
 * `POST /auth/otp/verify`, `POST /auth/oauth/link` and `POST /auth/password/verify`:
 * a wrong, expired or used code is a 401 (spec §3.2). A 400 that is only about
 * `code` (a malformed one slipping past) is still about the code. Any other 400
 * is left as itself: reporting "property password should not exist" as "wrong
 * code" would send someone retyping a right code forever.
 */
export function toCodeError(e: unknown, unauthorized: AuthErrorCode): AuthError {
  if (isApiError(e) && e.code === 'VALIDATION_FAILED' && onlyAbout(e, 'code')) {
    return toAuthError(e, { VALIDATION_FAILED: 'invalidCode' });
  }
  return toAuthError(e, { UNAUTHORIZED: unauthorized });
}

/**
 * A `VALIDATION_FAILED` about the terms version alone means the version sent is
 * no longer in force (`POST /me/terms/accept` documents exactly this answer, and
 * sign-up's 400 lists "terms version" among its causes).
 */
export function isTermsVersionRejection(e: unknown, field: 'version' | 'termsVersion'): boolean {
  return isApiError(e) && e.code === 'VALIDATION_FAILED' && onlyAbout(e, field);
}
