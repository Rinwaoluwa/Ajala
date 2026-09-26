import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isVerificationCodeValid } from '../rules/signUpRules';

/**
 * Confirms the emailed code. A code of the wrong shape is rejected here, without
 * a round trip.
 */
export const makeVerifyEmail =
  (repo: AuthRepository) =>
  async (verificationId: string, code: string): Promise<void> => {
    if (!isVerificationCodeValid(code)) throw new AuthError('invalidCode');
    return repo.verifyEmail(verificationId, code);
  };

export type VerifyEmailUseCase = ReturnType<typeof makeVerifyEmail>;
