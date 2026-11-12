import { getClientLocationHeader } from '../location/deviceLocation';

import { API_ERROR_CODES, ApiError, type ApiErrorCode, type ApiFieldError } from './ApiError';
import { apiConfig } from './apiConfig';

/**
 * The one place the app speaks HTTP.
 *
 * Everything above it works in entities and `ApiError`, so a repository never
 * parses a status code and a screen never sees a fetch. Responsibilities:
 *   - prefix the base URL and send/parse JSON,
 *   - attach a bearer token when the caller supplies one,
 *   - give up after `timeoutMs` rather than hanging on a dead network,
 *   - turn every failure into an `ApiError` carrying the API's own `code`,
 *   - retry a GET that failed for a reason worth retrying (see `GET_RETRY_DELAYS_MS`),
 *   - send where the phone is (`X-Client-Location`) on every signed-in call (below).
 *
 * It holds no session state. Who is signed in, and refreshing that, belongs to
 * the auth feature; wiring it in here would make every other feature depend on
 * auth just to make a request.
 */

export type ApiRequest = {
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  /**
   * JSON-encoded, or sent as it is when it is `FormData` (uploads, spec §1.4):
   * fetch then writes the multipart boundary into the Content-Type itself.
   */
  body?: unknown;
  /** Bearer token for endpoints that need one. */
  accessToken?: string | null;
  /** Extra headers, e.g. `X-Client-Location` on the feed (spec §2.11). */
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Whether a GET may be retried after a dropped connection or a 500/503.
   * Default true; ignored for every other method, which is never retried here.
   */
  retry?: boolean;
};

/** The API's error envelope, as `ErrorResponseDto` in the OpenAPI document. */
type ErrorEnvelope = {
  code?: string;
  message?: string;
  errors?: ApiFieldError[];
  details?: Record<string, unknown>;
  requestId?: string | null;
};

const KNOWN_CODES = new Set<string>(API_ERROR_CODES);

/**
 * Falls back by status when the body is not the documented envelope — a proxy's
 * HTML error page, say. The statuses are the ones the spec pairs with each code
 * (`docs/api/ajala-api-users-common.md` §5).
 */
const CODE_BY_STATUS: Record<number, ApiErrorCode> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  402: 'PAYMENT_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  410: 'GONE',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'UNPROCESSABLE',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

function codeFor(status: number, envelope: ErrorEnvelope): ApiErrorCode {
  if (envelope.code && KNOWN_CODES.has(envelope.code)) return envelope.code as ApiErrorCode;
  return CODE_BY_STATUS[status] ?? (status >= 500 ? 'INTERNAL' : 'BAD_REQUEST');
}

/**
 * The spec's advice for `SERVICE_UNAVAILABLE` and `INTERNAL` is "retry with
 * backoff for GETs; show a retry UI for mutations" (§5). A GET changes nothing,
 * so trying it again is safe; a POST might have landed before the failure, so it
 * is the caller's (and the person's) decision. A dropped connection gets the
 * same treatment — phones hop networks. A TIMEOUT does not: it already waited
 * 15 seconds, and two more of those would outlast anyone's patience.
 */
const GET_RETRY_DELAYS_MS = [400, 1200] as const;
const RETRYABLE: ReadonlySet<ApiErrorCode> = new Set(['NETWORK', 'INTERNAL', 'SERVICE_UNAVAILABLE']);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * The one dropped connection any method may retry: iOS's "The network
 * connection was lost" (NSURLErrorNetworkConnectionLost, -1005). It is what a
 * request gets when it goes out on a pooled connection the server or Cloudflare
 * has already closed: the first upload after the app sat idle — a Save draft, a
 * profile photo — failed this way every time, and the same request sent again a
 * moment later went through. The request never reached the server, so sending
 * it once more cannot post twice.
 */
const isStaleConnection = (e: unknown) =>
  e instanceof ApiError && e.code === 'NETWORK' && e.details?.staleConnection === true;

/**
 * Where the phone is, on every signed-in call that does not set it itself
 * (MOB-077). A free member may only open posts near them, and the server
 * checks it on every call that touches a post: opening, joining, comments,
 * saving, reports, the posts on a profile, Saved, and posts tagged in a chat.
 * Sent everywhere rather than call by call, so a call added later cannot miss
 * it. Without permission or a fix nothing is sent, and the server answers
 * `NO_LOCATION` where it needs one.
 */
async function withClientLocation(request: ApiRequest): Promise<ApiRequest> {
  if (!request.accessToken || request.headers?.['X-Client-Location']) return request;
  const location = await getClientLocationHeader();
  return location ? { ...request, headers: { ...location, ...request.headers } } : request;
}

export async function apiRequest<T>(input: ApiRequest): Promise<T> {
  const request = await withClientLocation(input);
  const retries = request.method === 'GET' && request.retry !== false ? GET_RETRY_DELAYS_MS : [];
  let staleRetried = false;
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await sendOnce<T>(request);
    } catch (e) {
      if (!staleRetried && isStaleConnection(e) && !request.signal?.aborted) {
        staleRetried = true;
        continue;
      }
      const delay = retries[attempt];
      const retryable = e instanceof ApiError && RETRYABLE.has(e.code) && !request.signal?.aborted;
      if (delay === undefined || !retryable) throw e;
      await sleep(delay);
    }
  }
}

async function sendOnce<T>(request: ApiRequest): Promise<T> {
  const multipart = request.body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    multipart ? apiConfig.uploadTimeoutMs : apiConfig.timeoutMs,
  );

  // The caller's own cancellation still works alongside the timeout.
  const onAbort = () => controller.abort();
  request.signal?.addEventListener('abort', onAbort);

  let response: Response;
  try {
    response = await fetch(`${apiConfig.baseUrl}${request.path}`, {
      method: request.method,
      headers: {
        Accept: 'application/json',
        ...(request.body === undefined || multipart ? null : { 'Content-Type': 'application/json' }),
        ...(request.accessToken ? { Authorization: `Bearer ${request.accessToken}` } : null),
        ...request.headers,
      },
      body:
        request.body === undefined
          ? undefined
          : multipart
            ? (request.body as FormData)
            : JSON.stringify(request.body),
      signal: controller.signal,
    });
  } catch (e) {
    // An abort here is the timeout firing, or the caller cancelling. Expo's fetch reports it
    // as its own "FetchRequestCanceledException", not an AbortError, so the signal decides.
    const aborted = controller.signal.aborted || (e instanceof Error && e.name === 'AbortError');
    // The platform's own reason ("Network request failed", a file it could not read) is only in dev logs.
    if (__DEV__ && !aborted) console.warn(`[api] ${request.method} ${request.path} did not go out:`, e);
    const reason = e instanceof Error ? e.message : String(e);
    const error = new ApiError({
      code: aborted ? 'TIMEOUT' : 'NETWORK',
      message: aborted ? 'The request timed out.' : 'Could not reach the server.',
      // See `isStaleConnection`: the one network failure safe to send again.
      details: !aborted && /network connection was lost/i.test(reason) ? { staleConnection: true } : null,
    });
    logFailure(request, error);
    throw error;
  } finally {
    clearTimeout(timer);
    request.signal?.removeEventListener('abort', onAbort);
  }

  // 202 and 204 are documented answers for several auth calls and carry no body.
  const noBody = response.status === 204 || response.headers.get('content-length') === '0';
  let payload: unknown = null;
  if (!noBody) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = (payload ?? {}) as ErrorEnvelope;
    const error = new ApiError({
      code: codeFor(response.status, envelope),
      message: envelope.message ?? `Request failed (${response.status}).`,
      status: response.status,
      fieldErrors: Array.isArray(envelope.errors) ? envelope.errors : [],
      details: envelope.details ?? null,
      requestId: envelope.requestId ?? null,
      retryAfterSeconds: response.status === 429 ? retryAfter(response.headers) : null,
    });
    logFailure(request, error);
    throw error;
  }

  return payload as T;
}

/**
 * Seconds until a rate-limited call may be made again. The API sends
 * `x-ratelimit-reset` (seconds left in the window); `Retry-After` is the standard
 * header and wins when present. Only the seconds form of `Retry-After` is read.
 */
function retryAfter(headers: Headers): number | null {
  for (const name of ['retry-after', 'x-ratelimit-reset']) {
    const seconds = Number(headers.get(name));
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  }
  return null;
}

/**
 * Development builds only: every failed call, in the JS console (React Native
 * DevTools, or the Metro terminal).
 *
 * What the API said and the request id to quote to the backend — never the
 * request body, which carries passwords, codes and tokens. Screens translate
 * errors into friendly copy; this is where the real answer stays visible.
 */
function logFailure(request: ApiRequest, error: ApiError) {
  if (!__DEV__) return;
  const fields = error.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
  console.warn(
    `[api] ${request.method} ${request.path} → ${error.status ?? '—'} ${error.code}: ${error.message}` +
      (fields ? ` (${fields})` : '') +
      (error.requestId ? ` [requestId ${error.requestId}]` : ''),
  );
}
