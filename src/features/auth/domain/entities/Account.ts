/**
 * The signed-in person's account, as far as the auth flows need it: enough to
 * decide where they go after signing in.
 *
 * The backend decides these states. The app never works out for itself whether a
 * profile is complete — it reads `profileCompletedAt` from `GET /me`.
 */
export type Account = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /**
   * Null until the server judges the profile complete. Which fields that takes
   * is the server's call — the spec disagrees with itself about gender (§8) —
   * so it is read from `GET /me` and never worked out here.
   */
  profileCompletedAt: string | null;
  /** False when the terms changed since the person last accepted them. */
  termsUpToDate: boolean;
};

/** The two providers the API accepts tokens from. */
export type IdentityProvider = 'apple' | 'google';
