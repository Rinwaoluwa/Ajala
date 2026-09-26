/**
 * A pending email verification: a code has been sent and is waiting to be entered.
 */
export type EmailVerification = {
  /** Identifies this attempt when the code comes back. */
  verificationId: string;
  /** Where the code was sent. */
  email: string;
  /** Digits in the code. */
  codeLength: number;
};
