import { AuthError } from '../entities/AuthError';
import type { AuthSession } from '../entities/AuthSession';
import type { Credentials } from '../entities/Credentials';
import type { AuthRepository } from '../repositories/AuthRepository';
import { canSubmitSignIn, isVerificationCodeValid, normalizeEmail } from '../rules/credentialRules';

/**
 * Signs in with email and password (FRD MOB-005, `POST /auth/login`).
 *
 * Only shape is checked here — a filled-in email and a non-empty password within
 * the API's 128 characters. The password is deliberately NOT run through the
 * sign-up rules: an account made before the rules changed must still be able to
 * sign in.
 *
 * A step-up code, when there is one, must be six digits (`LoginDto.otpCode`); a
 * malformed one never leaves the device, and is reported as a wrong code rather
 * than wrong credentials, because the credentials already passed to get here.
 */
export const makeSignIn =
  (repo: AuthRepository) =>
  async (credentials: Credentials): Promise<AuthSession> => {
    const email = normalizeEmail(credentials.email);
    if (!canSubmitSignIn(email, credentials.password)) throw new AuthError('invalidCredentials');
    if (credentials.otpCode !== undefined && !isVerificationCodeValid(credentials.otpCode)) {
      throw new AuthError('invalidCode');
    }
    return repo.signIn({ email, password: credentials.password, otpCode: credentials.otpCode });
  };

export type SignInUseCase = ReturnType<typeof makeSignIn>;
