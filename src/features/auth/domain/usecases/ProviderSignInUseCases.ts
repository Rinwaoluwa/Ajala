import { AuthError } from '../entities/AuthError';
import type { AuthSession } from '../entities/AuthSession';
import type { IdentityProvider } from '../entities/Account';
import type { AuthRepository } from '../repositories/AuthRepository';
import { isVerificationCodeValid } from '../rules/credentialRules';

/**
 * Google and Apple (FRD MOB-003, MOB-004).
 *
 * One endpoint per provider serves sign-up and sign-in alike, so there is one use
 * case for both screens. When the provider's email already belongs to an account,
 * the API does NOT sign anyone in: it emails that account a code and the person
 * proves they own it with `completeAccountLink`.
 */
export const makeSignInWithProvider =
  (repo: AuthRepository) =>
  (provider: IdentityProvider): Promise<AuthSession> =>
    repo.signInWithProvider(provider);

/** Whether to offer the provider at all — Sign in with Apple does not exist on Android. */
export const makeIsProviderAvailable =
  (repo: AuthRepository) =>
  (provider: IdentityProvider): Promise<boolean> =>
    repo.isProviderAvailable(provider);

/** Finishes linking with the code from the email. A malformed code never leaves the device. */
export const makeCompleteAccountLink =
  (repo: AuthRepository) =>
  async (challengeId: string, code: string): Promise<AuthSession> => {
    if (!challengeId) throw new AuthError('linkFailed');
    if (!isVerificationCodeValid(code)) throw new AuthError('invalidCode');
    return repo.completeAccountLink(challengeId, code);
  };

export type SignInWithProviderUseCase = ReturnType<typeof makeSignInWithProvider>;
export type CompleteAccountLinkUseCase = ReturnType<typeof makeCompleteAccountLink>;
