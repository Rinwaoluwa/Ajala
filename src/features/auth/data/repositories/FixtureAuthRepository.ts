import { AuthError } from '../../domain/entities/AuthError';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { VERIFICATION_CODE_LENGTH } from '../../domain/rules/signUpRules';

/**
 * STAND-IN BACKEND. There is no auth API yet, so this answers the way one would.
 *
 * This is the swap point: when the API exists, write `AuthRepositoryImpl` over
 * `core/api` (DTOs from `contracts/openapi`) and return it from `authModule.ts`.
 * Nothing above the repository changes.
 *
 * Behaviour, so every screen state can be reached by hand:
 *   - Every call waits FIXTURE_LATENCY_MS, so loading states are visible.
 *   - Signing up as `taken@example.com` fails with `emailTaken`.
 *   - The code `000000` fails with `invalidCode`; any other six digits pass.
 *
 * No data leaves the device and nothing is stored.
 */

const FIXTURE_LATENCY_MS = 700;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const createFixtureAuthRepository = (): AuthRepository => ({
  async startEmailSignUp(details) {
    await wait(FIXTURE_LATENCY_MS);
    if (details.email === 'taken@example.com') throw new AuthError('emailTaken');
    return {
      verificationId: `fixture-${Date.now()}`,
      email: details.email,
      codeLength: VERIFICATION_CODE_LENGTH,
    };
  },

  async verifyEmail(_verificationId, code) {
    await wait(FIXTURE_LATENCY_MS);
    if (code === '000000') throw new AuthError('invalidCode');
  },
});
