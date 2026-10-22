/**
 * A failure the API reported, or the transport failing before it could.
 *
 * The API's own contract says of its `code` field: "Branch on this, never on the
 * message". So this carries the code, and callers switch on it; `message` is for
 * logs and last-resort display, never for control flow.
 */

/**
 * Every code the API documents. The first block is the `ErrorResponseDto.code`
 * enum in `contracts/openapi/ajala-api.json`; the second comes from the client
 * spec (`docs/api/ajala-api-users-common.md` §5–§6), which covers the posts,
 * feed and RSVP endpoints the repo's OpenAPI copy does not include yet. Listing
 * them now means a 409 `POST_FULL` reaches its feature as itself rather than as a
 * generic `CONFLICT`.
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
  'ACCOUNT_LINK_REQUIRED',
  'HANDLE_COOLDOWN',
  'VERIFICATION_COOLDOWN',
  'TOTP_REQUIRED',
  'SERVICE_UNAVAILABLE',
  'INTERNAL',
  // Spec only, until the OpenAPI copy carries the posts endpoints.
  'EVENT_MONTHLY_CAP',
  'NO_CITY',
  'POST_FULL',
  'POST_STARTED',
  'POST_CANCELLED',
  'POST_HAS_ATTENDEES',
  'EXTERNAL_BOOKING',
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
  /** Extras for specific codes, e.g. `{ challengeId }` with ACCOUNT_LINK_REQUIRED. */
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
