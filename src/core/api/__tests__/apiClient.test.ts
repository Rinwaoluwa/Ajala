import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '../ApiError';
import { apiRequest } from '../apiClient';

/**
 * The one HTTP entry point, against a stubbed `fetch`: the error envelope
 * (spec §1.2) becomes a typed `ApiError`, and only GETs are retried.
 */

type FetchMock = jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>;

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

let fetchMock: FetchMock;

beforeEach(() => {
  fetchMock = jest.fn() as FetchMock;
  global.fetch = fetchMock as unknown as typeof fetch;
  // Development builds log every failure; keep the test output readable.
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (e) {
    if (e instanceof ApiError) return e;
    throw e;
  }
  throw new Error('expected the request to fail');
}

describe('apiRequest', () => {
  it('sends JSON with the bearer token when given one', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: true }));
    await expect(
      apiRequest({ method: 'POST', path: '/api/v1/x', body: { a: 1 }, accessToken: 'tok' }),
    ).resolves.toEqual({ ok: true });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init?.body).toBe('{"a":1}');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer tok', 'Content-Type': 'application/json' });
  });

  it('resolves a 204 without a body', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiRequest({ method: 'POST', path: '/api/v1/auth/logout' })).resolves.toBeNull();
  });

  it('turns the error envelope into a typed ApiError', async () => {
    fetchMock.mockResolvedValue(
      json(409, {
        code: 'ACCOUNT_LINK_REQUIRED',
        message: 'An account with this email exists',
        details: { challengeId: 'c-1' },
        requestId: 'req-1',
      }),
    );
    const e = await caught(apiRequest({ method: 'POST', path: '/api/v1/auth/oauth/google', body: {} }));
    expect(e).toMatchObject({
      code: 'ACCOUNT_LINK_REQUIRED',
      status: 409,
      details: { challengeId: 'c-1' },
      requestId: 'req-1',
      fieldErrors: [],
    });
  });

  it('carries the per-field errors of VALIDATION_FAILED', async () => {
    const errors = [{ field: 'password', message: 'password must contain a digit' }];
    fetchMock.mockResolvedValue(json(400, { code: 'VALIDATION_FAILED', message: 'Validation failed', errors, requestId: null }));
    const e = await caught(apiRequest({ method: 'POST', path: '/api/v1/auth/signup/email', body: {} }));
    expect(e).toMatchObject({ code: 'VALIDATION_FAILED', fieldErrors: errors });
  });

  it('falls back by status when the body is not the envelope', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>too big</html>', { status: 413 }));
    expect((await caught(apiRequest({ method: 'POST', path: '/x', body: {} }))).code).toBe('PAYLOAD_TOO_LARGE');

    fetchMock.mockResolvedValueOnce(json(418, { code: 'SOMETHING_NEW', message: 'x' }));
    expect((await caught(apiRequest({ method: 'POST', path: '/x', body: {} }))).code).toBe('BAD_REQUEST');
  });

  it('reads how long to wait from a 429', async () => {
    fetchMock.mockResolvedValue(json(429, { code: 'RATE_LIMITED', message: 'Slow down' }, { 'retry-after': '42' }));
    const e = await caught(apiRequest({ method: 'POST', path: '/api/v1/auth/otp/resend', body: {} }));
    expect(e).toMatchObject({ code: 'RATE_LIMITED', retryAfterSeconds: 42 });
  });

  it('reports a request that never reached the API as NETWORK', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const e = await caught(apiRequest({ method: 'POST', path: '/x', body: {} }));
    expect(e.code).toBe('NETWORK');
    expect(e.status).toBeNull();
  });
});

describe('retrying GETs (spec §5)', () => {
  it('retries a GET after a 503, with a pause, and returns the answer', async () => {
    jest.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(json(503, { code: 'SERVICE_UNAVAILABLE', message: 'x' }))
      .mockResolvedValueOnce(json(200, { termsVersion: '2026-01-01' }));

    const pending = apiRequest({ method: 'GET', path: '/api/v1/app/config' });
    await jest.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ termsVersion: '2026-01-01' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after two retries', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(async () => json(500, { code: 'INTERNAL', message: 'x' }));

    const pending = caught(apiRequest({ method: 'GET', path: '/api/v1/me' }));
    await jest.advanceTimersByTimeAsync(5000);
    expect((await pending).code).toBe('INTERNAL');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('never retries a mutation, which may already have landed', async () => {
    fetchMock.mockResolvedValue(json(503, { code: 'SERVICE_UNAVAILABLE', message: 'x' }));
    await caught(apiRequest({ method: 'POST', path: '/api/v1/auth/login', body: {} }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry an answer that will not change, such as a 401', async () => {
    fetchMock.mockResolvedValue(json(401, { code: 'UNAUTHORIZED', message: 'x' }));
    await caught(apiRequest({ method: 'GET', path: '/api/v1/me', accessToken: 't' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can be told not to retry', async () => {
    fetchMock.mockResolvedValue(json(503, { code: 'SERVICE_UNAVAILABLE', message: 'x' }));
    await caught(apiRequest({ method: 'GET', path: '/api/v1/me', retry: false }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
