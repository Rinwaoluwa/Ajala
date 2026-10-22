import type { Account } from '../entities/Account';
import { AuthError } from '../entities/AuthError';
import type { AuthSession } from '../entities/AuthSession';
import type { AuthRepository } from '../repositories/AuthRepository';
import type { SessionStore } from '../repositories/SessionStore';

/**
 * An in-memory stand-in for the backend, shared by the domain tests, plus a
 * record of what it was asked to do. A failure in a test using this is a bug in
 * the domain, not in the network.
 *
 * Not a `.test.ts` file, so Jest treats it as a helper rather than a suite.
 *
 * Tokens with special meaning:
 *   - access token `expired-access` → `sessionExpired` from account calls and
 *     sign-out; `offline-access` → `network` from account calls
 *   - refresh token `stale` → `sessionExpired`; `offline` → `network`
 *
 * Terms: `2026-01-01` is the version in force. With `{ staleTerms: true }` the
 * remembered copy says `2025-06-01` until asked for a fresh one, and accepting
 * anything but the version in force answers `termsOutdated`.
 *
 * The sessions expire far in the future, so a test only meets the proactive
 * refresh when it sets an expiry (or a clock) of its own.
 */

export const TEST_SESSION: AuthSession = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  accessExpiresAt: '2099-01-01T00:00:00.000Z',
  sessionId: 'session-1',
  userId: 'user-1',
  isNew: false,
};

export const REFRESHED_SESSION: AuthSession = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
  accessExpiresAt: '2099-01-01T00:15:00.000Z',
  sessionId: 'session-1',
  userId: null,
  isNew: false,
};

export const COMPLETE_ACCOUNT: Account = {
  id: 'user-1',
  email: 'sarah@gmail.com',
  firstName: 'Sarah',
  lastName: 'Mitchell',
  profileCompletedAt: '2026-01-02T00:00:00.000Z',
  termsUpToDate: true,
};

export const TERMS_IN_FORCE = '2026-01-01';

export function createFakeAuthRepository(
  account: Account = COMPLETE_ACCOUNT,
  { staleTerms = false }: { staleTerms?: boolean } = {},
) {
  const calls = {
    signUp: [] as { email: string; fullName: string }[],
    verify: [] as [string, string][],
    /** The password sent with each verify call, in the same order. */
    verifyPassword: [] as (string | undefined)[],
    resend: [] as string[],
    signIn: [] as { email: string; password: string; otpCode?: string }[],
    provider: [] as string[],
    link: [] as [string, string][],
    forgot: [] as string[],
    reset: [] as [string, string][],
    refresh: [] as string[],
    account: [] as string[],
    acceptTerms: [] as [string, string][],
    /** Whether each terms read asked for a fresh copy. */
    termsReads: [] as boolean[],
    signOut: [] as string[],
  };

  const repo: AuthRepository = {
    signUpWithEmail: async (details) => {
      calls.signUp.push({ email: details.email, fullName: details.fullName });
      return { email: details.email, codeLength: 6 };
    },
    verifyEmailCode: async (email, code, password) => {
      calls.verify.push([email, code]);
      calls.verifyPassword.push(password);
      if (code === '000000') throw new AuthError('invalidCode');
      return { ...TEST_SESSION, isNew: true };
    },
    resendEmailCode: async (email) => {
      calls.resend.push(email);
    },
    signIn: async (credentials) => {
      calls.signIn.push(credentials);
      if (credentials.password === 'Wrong1234') throw new AuthError('invalidCredentials');
      if (credentials.password === 'Unverified1') throw new AuthError('emailNotVerified');
      return TEST_SESSION;
    },
    signInWithProvider: async (provider) => {
      calls.provider.push(provider);
      if (provider === 'google') {
        throw new AuthError('accountLinkRequired', undefined, [], 'challenge-1');
      }
      return { ...TEST_SESSION, isNew: true };
    },
    isProviderAvailable: async (provider) => provider === 'google',
    completeAccountLink: async (challengeId, code) => {
      calls.link.push([challengeId, code]);
      if (code === '000000') throw new AuthError('linkFailed');
      return TEST_SESSION;
    },
    requestPasswordReset: async (email) => {
      calls.forgot.push(email);
    },
    resetPassword: async (token, password) => {
      calls.reset.push([token, password]);
      if (token === 'expired') throw new AuthError('expiredCode');
    },
    refreshSession: async (token) => {
      calls.refresh.push(token);
      if (token === 'stale') throw new AuthError('sessionExpired');
      if (token === 'offline') throw new AuthError('network');
      return REFRESHED_SESSION;
    },
    getAccount: async (accessToken) => {
      calls.account.push(accessToken);
      if (accessToken === 'expired-access') throw new AuthError('sessionExpired');
      if (accessToken === 'offline-access') throw new AuthError('network');
      return account;
    },
    getCurrentTerms: async (options) => {
      calls.termsReads.push(Boolean(options?.fresh));
      return {
        version: staleTerms && !options?.fresh ? '2025-06-01' : TERMS_IN_FORCE,
        url: 'https://ajalatrvl.com/terms',
        privacyUrl: 'https://ajalatrvl.com/privacy',
      };
    },
    acceptTerms: async (accessToken, version) => {
      calls.acceptTerms.push([accessToken, version]);
      if (accessToken === 'expired-access') throw new AuthError('sessionExpired');
      if (version !== TERMS_IN_FORCE) throw new AuthError('termsOutdated');
    },
    signOut: async (token) => {
      calls.signOut.push(token);
      if (token === 'expired-access') throw new AuthError('sessionExpired');
    },
  };

  return { repo, calls };
}

/** A session store held in a variable, with a count of writes and clears. */
export function createFakeSessionStore(initial: AuthSession | null = TEST_SESSION) {
  let held = initial;
  const counts = { writes: 0, clears: 0 };
  const store: SessionStore = {
    read: async () => held,
    write: async (session) => {
      counts.writes += 1;
      held = session;
    },
    clear: async () => {
      counts.clears += 1;
      held = null;
    },
  };
  return {
    store,
    counts,
    get held() {
      return held;
    },
  };
}
