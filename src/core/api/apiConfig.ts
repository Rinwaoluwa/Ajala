/**
 * Where the API lives.
 *
 * `EXPO_PUBLIC_API_URL` overrides the default, which is the deployment named in
 * the OpenAPI document (`contracts/openapi/ajala-api.json`). Anything prefixed
 * `EXPO_PUBLIC_` is compiled into the bundle and readable by anyone with the app,
 * so a base URL is fine here and a secret never is.
 */
const DEFAULT_BASE_URL = 'https://dev-api.ajalatrvl.com';

export const apiConfig = {
  baseUrl: (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, ''),
  /** Long enough for a cold serverless start, short enough to fail before the user does. */
  timeoutMs: 15000,
} as const;
