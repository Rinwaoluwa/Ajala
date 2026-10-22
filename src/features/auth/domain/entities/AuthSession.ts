/**
 * Proof that someone is signed in.
 *
 * Mirrors what the API returns from sign-in and from verifying an emailed code.
 * The tokens go to `expo-secure-store` and nowhere else — never AsyncStorage,
 * never a plain module variable, never a route param.
 */
export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601. When the access token stops being accepted. */
  accessExpiresAt: string;
  /** This device's session, so it can be listed and signed out individually. */
  sessionId: string;
  /**
   * Who signed in. The API returns the profile when a code completes a sign-up
   * and omits it on an ordinary sign-in, so this is only sometimes known here.
   */
  userId: string | null;
  /** True when the code just completed a sign-up rather than a sign-in. */
  isNew: boolean;
};
