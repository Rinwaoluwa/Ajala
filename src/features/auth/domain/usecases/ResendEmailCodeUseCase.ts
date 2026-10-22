import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isEmailValid, normalizeEmail } from '../rules/credentialRules';

/** Sends the verification code again, to the same address. */
export const makeResendEmailCode =
  (repo: AuthRepository) =>
  async (email: string): Promise<void> => {
    const normalized = normalizeEmail(email);
    if (!isEmailValid(normalized)) throw new AuthError('invalidDetails');
    return repo.resendEmailCode(normalized);
  };

export type ResendEmailCodeUseCase = ReturnType<typeof makeResendEmailCode>;
