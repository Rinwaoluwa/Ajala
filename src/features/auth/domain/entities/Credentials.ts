/**
 * What someone types to sign in (FRD MOB-005).
 */
export type Credentials = {
  email: string;
  password: string;
  /**
   * The emailed code, supplied only when a previous attempt answered
   * `stepUpRequired`. Step-up is a RETRY of sign-in, not a separate endpoint:
   * the same email and password go back up with the code attached.
   */
  otpCode?: string;
};
