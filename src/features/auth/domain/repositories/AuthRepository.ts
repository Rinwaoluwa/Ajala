import type { EmailVerification } from '../entities/EmailVerification';
import type { SignUpDetails } from '../entities/SignUpDetails';

/**
 * What the auth feature needs from a backend. The data layer implements it.
 *
 * Methods reject with an `AuthError`, never a raw transport error.
 */
export interface AuthRepository {
  /** Creates the pending account and emails a verification code. */
  startEmailSignUp(details: SignUpDetails): Promise<EmailVerification>;
  /** Confirms the code. Rejects with `invalidCode` when it does not match. */
  verifyEmail(verificationId: string, code: string): Promise<void>;
}
