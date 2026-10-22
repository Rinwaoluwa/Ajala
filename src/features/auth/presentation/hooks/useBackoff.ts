import { useCallback, useState } from 'react';

import { useCountdown } from '@shared/hooks/useCountdown';

import { isAuthError } from '../../domain/entities/AuthError';

/**
 * Holds a form's submit button off after the API answered 429 RATE_LIMITED —
 * spec §5: "back off; disable the button briefly".
 *
 * The wait is the one the API gave (`Retry-After` / `x-ratelimit-reset`, carried
 * as `retryAfterSeconds`), or `DEFAULT_BACKOFF_SECONDS` when it gave none.
 * Tapping again sooner only earns another 429 and, on sign-in, looks like an
 * attack to the server.
 *
 * `waitSeconds` counts down to 0, which is when the button comes back.
 */
export const DEFAULT_BACKOFF_SECONDS = 30;

export function useBackoff() {
  const [until, setUntil] = useState<number | null>(null);
  const waitSeconds = useCountdown(until);

  /** True when `e` was a rate limit, in which case the wait has started. */
  const backOffIfLimited = useCallback((e: unknown): boolean => {
    if (!isAuthError(e) || e.code !== 'rateLimited') return false;
    const seconds = e.retryAfterSeconds ?? DEFAULT_BACKOFF_SECONDS;
    setUntil(Date.now() + seconds * 1000);
    return true;
  }, []);

  return { waitSeconds, blocked: waitSeconds > 0, backOffIfLimited };
}
