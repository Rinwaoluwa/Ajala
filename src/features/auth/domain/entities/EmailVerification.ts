/**
 * A pending email verification: a code has been sent and is waiting to be entered.
 *
 * The API identifies the challenge by the address it was sent to — there is no
 * separate id — so the address is what the verify and resend calls carry.
 */
export type EmailVerification = {
  /** Where the code was sent. Shown masked, never in full. */
  email: string;
  codeLength: number;
  /**
   * The password just chosen on the sign-up form, which `POST /auth/otp/verify`
   * requires when the code completes a sign-up (spec §2.2). Absent when sign-in
   * found an existing but unverified account: the code alone verifies that.
   * Held in memory only, for the length of the verification, and dropped once
   * the code is accepted — never stored, never put in a route.
   */
  password?: string;
};
