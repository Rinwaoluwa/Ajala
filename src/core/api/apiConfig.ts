/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_API_URL` overrides the default, staging, which development and
 * preview builds use. A production build must set it. Anything prefixed
 * `EXPO_PUBLIC_` is compiled into the bundle and readable by anyone with the app,
 * so a base URL is fine here and a secret never is.
 */
const DEFAULT_BASE_URL = 'https://staging-api.ajalatrvl.com';

export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
  /** Long enough for a cold serverless start, short enough to fail before the user does. */
  timeoutMs: 15000,
} as const;
