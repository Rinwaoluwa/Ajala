import type { AuthSession } from '../entities/AuthSession';

/**
 * When to refresh before a call rather than after it fails.
 *
 * The spec (§7.2): "refresh proactively when `accessExpiresAt` is under 60 s
 * away". A token that expires in flight costs a 401, a refresh and a retry — three
 * round trips where one would do — and a token used with seconds to spare is the
 * one most likely to do that.
 */
export const REFRESH_LEEWAY_MS = 60 * 1000;

/**
 * True when the access token has expired or will within the leeway.
 *
 * An expiry that cannot be read is treated as fine: the call goes out, and a 401
 * still triggers the refresh. Refreshing on every call because of a bad date
 * would spend a single-use token for nothing.
 */
export function shouldRefreshBefore(session: AuthSession, now: number): boolean {
  const expiresAt = Date.parse(session.accessExpiresAt);
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt - now < REFRESH_LEEWAY_MS;
}
