import { AuthError } from '../entities/AuthError';
import type { EmailVerification } from '../entities/EmailVerification';
import type { SignUpDetails } from '../entities/SignUpDetails';
import type { AuthRepository } from '../repositories/AuthRepository';
import { canSubmitSignUp, normalizeSignUpDetails } from '../rules/signUpRules';

/**
 * Sends the sign-up details and starts email verification (FRD MOB-001).
 *
 * Re-checks the rules even though the screen only enables Proceed when they pass.
 * The screen is a convenience; this is the gate.
 */
export const makeStartEmailSignUp =
  (repo: AuthRepository, now: () => Date = () => new Date()) =>
  async (details: SignUpDetails): Promise<EmailVerification> => {
    const normalized = normalizeSignUpDetails(details);
    if (!canSubmitSignUp(normalized, now())) throw new AuthError('invalidDetails');
    return repo.startEmailSignUp(normalized);
  };

export type StartEmailSignUpUseCase = ReturnType<typeof makeStartEmailSignUp>;
