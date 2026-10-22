import { apiRequest } from '@core/api/apiClient';

/**
 * Values the API serves about the app itself: the current terms, the support
 * links, and the oldest build still allowed (`GET /app/config`, `AppConfigDto`).
 *
 * Remembered for `APP_CONFIG_TTL_MS`, because several screens want the same
 * answer and it changes about as often as the terms do. The screen-to-API map
 * calls it "cacheable 5 minutes"; holding it for the life of the process instead
 * would let an app left open across a terms change keep sending the old
 * `termsVersion`, which sign-up and `POST /me/terms/accept` then refuse.
 *
 * Concurrent callers share one request. A failed fetch is not cached, so the next
 * caller retries rather than inheriting the failure.
 */

export type AppConfig = {
  /** The terms in force. Sent when someone signs up, to record what they accepted. */
  termsVersion: string;
  termsUrl: string;
  privacyUrl: string;
  faqUrl: string;
  supportEmail: string;
  /** The oldest build still supported, per platform, as `major.minor.patch`. */
  minAppVersion: { ios: string; android: string };
};

export const APP_CONFIG_TTL_MS = 5 * 60 * 1000;

let pending: Promise<AppConfig> | null = null;
let fetchedAt = 0;

export function getAppConfig({ fresh = false }: { fresh?: boolean } = {}): Promise<AppConfig> {
  const expired = pending !== null && fetchedAt > 0 && Date.now() - fetchedAt > APP_CONFIG_TTL_MS;
  if (fresh || expired) pending = null;

  if (!pending) {
    fetchedAt = 0;
    const request = apiRequest<AppConfig>({ method: 'GET', path: '/api/v1/app/config' });
    pending = request;
    request.then(
      () => {
        // Only the request still current may stamp the clock; a superseded one
        // finishing late must not make a newer answer look older than it is.
        if (pending === request) fetchedAt = Date.now();
      },
      () => {
        if (pending === request) pending = null;
      },
    );
  }
  return pending;
}

/** Drops the remembered copy. For tests, and for a pull-to-refresh later. */
export function clearAppConfigCache(): void {
  pending = null;
  fetchedAt = 0;
}
