/**
 * A failure the API reported, or the transport failing before it could.
 *
 * The API's own contract says of its `code` field: "Branch on this, never on the
 * message". So this carries the code, and callers switch on it; `message` is for
 * logs and last-resort display, never for control flow.
 */

/**
 * Every code the API documents, in the order of Swagger's `ErrorResponseDto.code`
 * enum (the same `ErrorCode` union as `docs/api/ajala-api-users-common.md` §6;
 * what to do with each is in §5). Listing them all means a 409 `POST_FULL`
 * reaches its feature as itself rather than as a generic `CONFLICT`; a code the
 * API adds later falls back by status (see `apiClient`).
 *
 * Swagger dropped `ACCOUNT_LINK_REQUIRED` (accounts are never joined; an OAuth
 * sign-in on an email that already has an account is `EMAIL_ALREADY_REGISTERED`)
 * and `NO_CITY` (there are no cities any more; with neither a location nor a
 * teleport the feed answers `NO_LOCATION`).
 */
export const API_ERROR_CODES = [
  'VALIDATION_FAILED',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_ALLOWED',
  'CONFLICT',
  'GONE',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'UNPROCESSABLE',
  'RATE_LIMITED',
  'PAYMENT_REQUIRED',
  'EMAIL_NOT_VERIFIED',
  'STEP_UP_REQUIRED',
  'REAUTH_REQUIRED',
  'PASSWORD_BREACHED',
  // 409 from Google/Apple sign-in: the email already has an account, signed in
  // another way. `details.signInMethods` says which ways to offer instead.
  'EMAIL_ALREADY_REGISTERED',
  'HANDLE_COOLDOWN',
  'LAST_SIGN_IN_METHOD',
  'TOTP_REQUIRED',
  'TOTP_CODE_USED',
  'SIGN_IN_AGAIN',
  'SIGNUP_REFUSED',
  // Too many trusted-person requests in a day (429).
  'TRUSTED_REQUEST_LIMIT',
  'REPORTING_PAUSED',
  'CHAT_START_LIMIT',
  'EVENT_MONTHLY_CAP',
  // 404 from the feed, map and search: no X-Client-Location and no teleport.
  // There is no home-city fallback.
  'NO_LOCATION',
  'POST_FULL',
  // A post's group chat holds 100; someone going past that waits for a place,
  // and until then opening the chat answers this 409.
  'GROUP_CHAT_FULL',
  'POST_STARTED',
  'POST_CANCELLED',
  'POST_HAS_ATTENDEES',
  'CAPTCHA_FAILED',
  'WAITLIST_LINK_INVALID',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
] as const;

/** A code the API sent, plus the two only the client can raise. */
export type ApiErrorCode =
  | (typeof API_ERROR_CODES)[number]
  /** The request never reached the API: offline, DNS, TLS. */
  | 'NETWORK'
  /** The request was given up on before the API answered. */
  | 'TIMEOUT';

export type ApiFieldError = { field: string; message: string };

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number | null;
  /** Which fields failed, sent with VALIDATION_FAILED. */
  readonly fieldErrors: ApiFieldError[];
  /** Extras for specific codes, e.g. `{ signInMethods }` with EMAIL_ALREADY_REGISTERED. */
  readonly details: Record<string, unknown> | null;
  /** The API's own id for this request. Quote it when reporting a problem. */
  readonly requestId: string | null;
  /**
   * With RATE_LIMITED: how many seconds until the API will take the request
   * again, from its `Retry-After` or `x-ratelimit-reset` header. Null when it
   * did not say.
   */
  readonly retryAfterSeconds: number | null;

  constructor(init: {
    code: ApiErrorCode;
    message: string;
    status?: number | null;
    fieldErrors?: ApiFieldError[];
    details?: Record<string, unknown> | null;
    requestId?: string | null;
    retryAfterSeconds?: number | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.code = init.code;
    this.status = init.status ?? null;
    this.fieldErrors = init.fieldErrors ?? [];
    this.details = init.details ?? null;
    this.requestId = init.requestId ?? null;
    this.retryAfterSeconds = init.retryAfterSeconds ?? null;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;
