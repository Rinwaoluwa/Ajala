/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_API_URL` overrides the default, staging, which development and
 * preview builds use. A production build must set it. Anything prefixed
 * `EXPO_PUBLIC_` is compiled into the bundle and readable by anyone with the app,
 * so a base URL is fine here and a secret never is.
 */

import { flavourServers } from '../config/flavour';
const DEFAULT_BASE_URL = 'https://staging-api.ajalatrvl.com';

export const apiConfig = {
  // The dev flavour's own server wins over the compiled-in address (`flavour.ts`).
  baseUrl: (flavourServers().api ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
  /** Long enough for a cold serverless start, short enough to fail before the user does. */
  timeoutMs: 15000,
  /**
   * An upload (multipart: photos) is bounded by the phone's upload speed, not
   * the server: two post photos on a phone connection could pass 15 seconds,
   * and Save draft and Publish were cut off halfway as "no connection".
   */
  uploadTimeoutMs: 120000,
} as const;
