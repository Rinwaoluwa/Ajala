import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isEmailValid, normalizeEmail } from '../rules/credentialRules';

/**
 * Starts a password reset (FRD MOB-006, `POST /auth/password/forgot`). The API
 * emails a 6-digit code; `VerifyPasswordResetCodeUseCase` trades it for a reset
 * token and `ResetPasswordUseCase` spends that. Called again, it sends a new
 * code — which is how the code screen's "Resend code" works.
 *
 * Succeeds for any well-formed address, registered or not — see the repository
 * contract for why the answer must not depend on whether the account exists.
 */
export const makeRequestPasswordReset =
  (repo: AuthRepository) =>
  async (email: string): Promise<void> => {
    const normalized = normalizeEmail(email);
    if (!isEmailValid(normalized)) throw new AuthError('invalidDetails');
    return repo.requestPasswordReset(normalized);
  };

export type RequestPasswordResetUseCase = ReturnType<typeof makeRequestPasswordReset>;
