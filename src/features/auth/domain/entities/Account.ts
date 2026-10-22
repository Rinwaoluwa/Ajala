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
   * Null until first name, last name, date of birth and gender are all present.
   * Gender is never asked at sign-up, so every new account starts without it.
   */
  profileCompletedAt: string | null;
  /** False when the terms changed since the person last accepted them. */
  termsUpToDate: boolean;
};

/** The two providers the API accepts tokens from. */
export type IdentityProvider = 'apple' | 'google';
