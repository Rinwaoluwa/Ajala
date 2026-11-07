import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isEmailValid, isVerificationCodeValid, normalizeEmail } from '../rules/credentialRules';

/**
 * Password reset, step 2 (FRD MOB-006, `POST /auth/password/verify { email, code }`
 * → 200 `{ token }`): trades the emailed 6-digit code for a reset token.
 *
 * The token is single use and lasts 15 minutes; the caller holds it in memory
 * for `ResetPasswordUseCase` and never writes it anywhere else.
 *
 * A code or address of the wrong shape is rejected here, without a round trip —
 * and without spending one of the code's five tries.
 */
export const makeVerifyPasswordResetCode =
  (repo: AuthRepository) =>
  async (email: string, code: string): Promise<string> => {
    const normalized = normalizeEmail(email);
    if (!isEmailValid(normalized)) throw new AuthError('invalidDetails');
    if (!isVerificationCodeValid(code)) throw new AuthError('invalidCode');
    return repo.verifyPasswordResetCode(normalized, code);
  };

export type VerifyPasswordResetCodeUseCase = ReturnType<typeof makeVerifyPasswordResetCode>;
