import { AuthError } from '../entities/AuthError';
import type { AuthSession } from '../entities/AuthSession';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isVerificationCodeValid, normalizeEmail } from '../rules/credentialRules';

/**
 * Confirms the emailed code, which signs the person in.
 *
 * A code of the wrong shape is rejected here, without a round trip.
 */
export const makeVerifyEmail =
  (repo: AuthRepository) =>
  async (email: string, code: string, password?: string): Promise<AuthSession> => {
    if (!isVerificationCodeValid(code)) throw new AuthError('invalidCode');
    return repo.verifyEmailCode(normalizeEmail(email), code, password || undefined);
  };

export type VerifyEmailUseCase = ReturnType<typeof makeVerifyEmail>;
