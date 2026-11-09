import type { AuthSession } from '../entities/AuthSession';
import type { IdentityProvider } from '../entities/Account';
import type { AuthRepository } from '../repositories/AuthRepository';

/**
 * Google and Apple (FRD MOB-003, MOB-004).
 *
 * One endpoint per provider serves sign-up and sign-in alike, so there is one use
 * case for both screens. When the provider's email already belongs to an account
 * that signs in another way, the API does NOT sign anyone in and never joins the
 * two: it answers `emailAlreadyRegistered` with the ways into that account, and
 * the screen tells the person to use one of them.
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

export type SignInWithProviderUseCase = ReturnType<typeof makeSignInWithProvider>;
