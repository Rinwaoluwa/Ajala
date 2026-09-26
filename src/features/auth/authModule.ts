import { createFixtureAuthRepository } from './data/repositories/FixtureAuthRepository';
import { makeStartEmailSignUp } from './domain/usecases/StartEmailSignUpUseCase';
import { makeVerifyEmail } from './domain/usecases/VerifyEmailUseCase';

/**
 * The feature's composition root: the one place that knows which repository
 * implementation backs the use cases.
 *
 * Today that is the fixture repository — see its header. Replace it here, and only
 * here, when the auth API lands.
 */
export function createAuthUseCases() {
  const repo = createFixtureAuthRepository();
  return {
    startEmailSignUp: makeStartEmailSignUp(repo),
    verifyEmail: makeVerifyEmail(repo),
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
