import { AuthError } from '../../domain/entities/AuthError';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { VERIFICATION_CODE_LENGTH } from '../../domain/rules/credentialRules';

/**
 * AN OFFLINE STAND-IN, kept alongside the real repository.
 *
 * `authModule` uses the real API. This exists so the flows can be worked on
 * without a reachable backend, and so every error state can be reached by hand:
 *   - Every call waits FIXTURE_LATENCY_MS, so loading states are visible.
 *   - Signing in with the password `Wrong1234` fails with `invalidCredentials`
 *     and `Unverified1` with `emailNotVerified`; any other password signs in.
 *   - The code `000000` fails with `invalidCode` and `111111` with `expiredCode`.
 *   - Sign-up and password reset always succeed, because the real API answers the
 *     same whether or not the address has an account.
 *   - Signing in with the password `StepUp123` asks for a step-up code; any
 *     well-formed code then signs in.
 *   - Google answers "account link required"; Apple signs up a new account.
 *     Linking accepts any code but `000000`.
 *   - The account is a new one with an unfinished profile.
 *
 * Nothing is stored and no data leaves the device.
 */

const FIXTURE_LATENCY_MS = 700;

const REJECTED_PASSWORD = 'Wrong1234';
const UNVERIFIED_PASSWORD = 'Unverified1';
const STEP_UP_PASSWORD = 'StepUp123';
const REJECTED_CODE = '000000';
const EXPIRED_CODE = '111111';

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const fixtureSession = (isNew: boolean) => ({
  accessToken: `fixture-access-${Date.now()}`,
  refreshToken: `fixture-refresh-${Date.now()}`,
  accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  sessionId: 'fixture-session',
  userId: 'fixture-user',
  isNew,
});

export const createFixtureAuthRepository = (): AuthRepository => ({
  async signUpWithEmail(details) {
    await wait(FIXTURE_LATENCY_MS);
    return { email: details.email, codeLength: VERIFICATION_CODE_LENGTH };
  },

  async verifyEmailCode(_email, code) {
    await wait(FIXTURE_LATENCY_MS);
    if (code === REJECTED_CODE) throw new AuthError('invalidCode');
    if (code === EXPIRED_CODE) throw new AuthError('expiredCode');
    return fixtureSession(true);
  },

  async resendEmailCode() {
    await wait(FIXTURE_LATENCY_MS);
  },

  async signIn(credentials) {
    await wait(FIXTURE_LATENCY_MS);
    if (credentials.password === REJECTED_PASSWORD) throw new AuthError('invalidCredentials');
    if (credentials.password === UNVERIFIED_PASSWORD) throw new AuthError('emailNotVerified');
    if (credentials.password === STEP_UP_PASSWORD && !credentials.otpCode) {
      throw new AuthError('stepUpRequired');
    }
    return fixtureSession(false);
  },

  async signInWithProvider(provider) {
    await wait(FIXTURE_LATENCY_MS);
    if (provider === 'google') {
      throw new AuthError('accountLinkRequired', undefined, [], 'fixture-challenge');
    }
    return fixtureSession(true);
  },

  async isProviderAvailable() {
    return true;
  },

  async completeAccountLink(_challengeId, code) {
    await wait(FIXTURE_LATENCY_MS);
    if (code === REJECTED_CODE) throw new AuthError('linkFailed');
    return fixtureSession(false);
  },

  async requestPasswordReset() {
    await wait(FIXTURE_LATENCY_MS);
  },

  async resetPassword(token) {
    await wait(FIXTURE_LATENCY_MS);
    if (token === 'expired') throw new AuthError('expiredCode');
  },

  async refreshSession() {
    await wait(FIXTURE_LATENCY_MS);
    return fixtureSession(false);
  },

  async getAccount() {
    await wait(FIXTURE_LATENCY_MS);
    return {
      id: 'fixture-user',
      email: 'fixture@example.com',
      firstName: 'Fixture',
      lastName: 'Traveller',
      profileCompletedAt: null,
      termsUpToDate: true,
    };
  },

  async getCurrentTerms() {
    return {
      version: 'fixture',
      url: 'https://ajalatrvl.com/terms',
      privacyUrl: 'https://ajalatrvl.com/privacy',
    };
  },

  async acceptTerms() {
    await wait(FIXTURE_LATENCY_MS);
  },

  async signOut() {
    await wait(FIXTURE_LATENCY_MS);
  },
});
