import { describe, expect, it, jest } from '@jest/globals';

import type { AuthSession } from '../entities/AuthSession';
import { AuthError } from '../entities/AuthError';
import { nextStepFor } from '../rules/accountRules';
import { REFRESH_LEEWAY_MS, shouldRefreshBefore } from '../rules/sessionRules';
import { makeAcceptTerms, makeResolveNextStep } from '../usecases/AccountUseCases';
import { makeCompleteAccountLink, makeSignInWithProvider } from '../usecases/ProviderSignInUseCases';
import { makeWithSession } from '../usecases/SessionUseCases';
import {
  COMPLETE_ACCOUNT,
  REFRESHED_SESSION,
  TERMS_IN_FORCE,
  TEST_SESSION,
  createFakeAuthRepository,
  createFakeSessionStore,
} from './authTestDoubles';

/** A promise and the function that settles it, for ordering concurrent calls. */
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}

/**
 * The parts of the screen-to-API map that are rules rather than calls: where a
 * signed-in person goes, how an expired token is refreshed, and how Google and
 * Apple hand over to an account link.
 */

describe('nextStepFor', () => {
  it('asks for changed terms before anything else, even profile setup', () => {
    // Spec §2.1: nobody carries on, even into setup, under terms they have not accepted.
    expect(nextStepFor({ ...COMPLETE_ACCOUNT, profileCompletedAt: null, termsUpToDate: false })).toBe(
      'acceptTerms',
    );
  });

  it('asks for the terms when they changed', () => {
    expect(nextStepFor({ ...COMPLETE_ACCOUNT, termsUpToDate: false })).toBe('acceptTerms');
  });

  it('sends an unfinished profile to setup', () => {
    expect(nextStepFor({ ...COMPLETE_ACCOUNT, profileCompletedAt: null })).toBe('completeProfile');
  });

  it('lets everyone else into the app', () => {
    expect(nextStepFor(COMPLETE_ACCOUNT)).toBe('home');
  });
});

describe('withSession', () => {
  it('uses the stored access token', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const call = jest.fn(async (token: string) => token);

    await expect(makeWithSession(repo, fake.store)(call)).resolves.toBe('access-1');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('refreshes once on an expired token, stores the new pair, and retries', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const call = jest.fn(async (token: string) => {
      if (token === 'access-1') throw new AuthError('sessionExpired');
      return token;
    });

    await expect(makeWithSession(repo, fake.store)(call)).resolves.toBe('access-2');
    expect(calls.refresh).toEqual(['refresh-1']);
    // The rotated pair is kept, and what the refresh answer lacks is carried over.
    expect(fake.held).toEqual({ ...REFRESHED_SESSION, userId: 'user-1' });
  });

  it('shares one refresh between calls that expire together', async () => {
    // Refresh tokens are single use: two refreshes would sign the session out.
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const withSession = makeWithSession(repo, fake.store);
    const call = async (token: string) => {
      if (token === 'access-1') throw new AuthError('sessionExpired');
      return token;
    };

    await expect(Promise.all([withSession(call), withSession(call), withSession(call)])).resolves.toEqual([
      'access-2',
      'access-2',
      'access-2',
    ]);
    expect(calls.refresh).toHaveLength(1);
  });

  it('ends the session when the refresh is refused', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...TEST_SESSION, refreshToken: 'stale' });
    const onEnded = jest.fn();
    const call = async () => {
      throw new AuthError('sessionExpired');
    };

    await expect(makeWithSession(repo, fake.store, onEnded)(call)).rejects.toMatchObject({
      code: 'sessionExpired',
    });
    expect(fake.held).toBeNull();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails for want of a network', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...TEST_SESSION, refreshToken: 'offline' });
    const onEnded = jest.fn();
    const call = async () => {
      throw new AuthError('sessionExpired');
    };

    await expect(makeWithSession(repo, fake.store, onEnded)(call)).rejects.toMatchObject({ code: 'network' });
    expect(fake.held).not.toBeNull();
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('does not refresh for failures that are not about the token', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const call = async () => {
      throw new AuthError('network');
    };

    await expect(makeWithSession(repo, fake.store)(call)).rejects.toMatchObject({ code: 'network' });
    expect(calls.refresh).toHaveLength(0);
  });

  it('ends the session when there is none stored', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore(null);
    await expect(makeWithSession(repo, fake.store)(async () => 'x')).rejects.toMatchObject({
      code: 'sessionExpired',
    });
  });
});

describe('shouldRefreshBefore', () => {
  const expiresAt = Date.parse('2026-05-01T12:00:00.000Z');
  const session: AuthSession = { ...TEST_SESSION, accessExpiresAt: '2026-05-01T12:00:00.000Z' };

  it('refreshes inside the last minute, and after expiry', () => {
    expect(shouldRefreshBefore(session, expiresAt - REFRESH_LEEWAY_MS + 1)).toBe(true);
    expect(shouldRefreshBefore(session, expiresAt + 1000)).toBe(true);
  });

  it('leaves a token with more than a minute to run alone', () => {
    expect(shouldRefreshBefore(session, expiresAt - REFRESH_LEEWAY_MS - 1)).toBe(false);
  });

  it('does not spend a refresh token over an unreadable expiry', () => {
    expect(shouldRefreshBefore({ ...session, accessExpiresAt: 'soon' }, expiresAt)).toBe(false);
  });
});

describe('withSession: refreshing ahead of expiry', () => {
  const nearExpiry: AuthSession = { ...TEST_SESSION, accessExpiresAt: '2026-05-01T12:00:00.000Z' };
  const thirtySecondsBefore = () => Date.parse(nearExpiry.accessExpiresAt) - 30_000;

  it('refreshes before the call when under a minute is left, and makes the call once', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore(nearExpiry);
    const call = jest.fn(async (token: string) => token);

    await expect(makeWithSession(repo, fake.store, undefined, thirtySecondsBefore)(call)).resolves.toBe(
      'access-2',
    );
    expect(calls.refresh).toEqual(['refresh-1']);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('shares one early refresh between calls that start together', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore(nearExpiry);
    const withSession = makeWithSession(repo, fake.store, undefined, thirtySecondsBefore);
    const call = async (token: string) => token;

    await expect(Promise.all([withSession(call), withSession(call)])).resolves.toEqual(['access-2', 'access-2']);
    expect(calls.refresh).toHaveLength(1);
  });

  it('still makes the call with the old token when the early refresh is offline', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...nearExpiry, refreshToken: 'offline' });
    const onEnded = jest.fn();

    await expect(
      makeWithSession(repo, fake.store, onEnded, thirtySecondsBefore)(async (token) => token),
    ).resolves.toBe('access-1');
    expect(onEnded).not.toHaveBeenCalled();
  });

  it('ends the session when the early refresh is refused', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...nearExpiry, refreshToken: 'stale' });
    const onEnded = jest.fn();
    const call = jest.fn(async (token: string) => token);

    await expect(makeWithSession(repo, fake.store, onEnded, thirtySecondsBefore)(call)).rejects.toMatchObject({
      code: 'sessionExpired',
    });
    expect(call).not.toHaveBeenCalled();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });
});

describe('withSession: single-use refresh tokens', () => {
  it('never presents a refresh token another call has already spent', async () => {
    // Call A read the session, then B refreshed it. When A's old token is then
    // refused, A must retry with B's new pair — presenting refresh-1 again would
    // revoke the whole session (spec §1.1).
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const withSession = makeWithSession(repo, fake.store);
    const bDone = deferred();

    const a = withSession(async (token) => {
      if (token === 'access-1') {
        await bDone.promise;
        throw new AuthError('sessionExpired');
      }
      return token;
    });
    const b = withSession(async (token) => {
      if (token === 'access-1') throw new AuthError('sessionExpired');
      return token;
    }).finally(bDone.release);

    await expect(Promise.all([a, b])).resolves.toEqual(['access-2', 'access-2']);
    expect(calls.refresh).toEqual(['refresh-1']);
  });

  it('drops a refresh that lands after sign-out, rather than signing back in', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const answer = deferred();
    const slowRepo = {
      ...repo,
      refreshSession: async (token: string) => {
        await answer.promise;
        return repo.refreshSession(token);
      },
    };
    const withSession = makeWithSession(slowRepo, fake.store);

    const pending = withSession(async (token) => {
      if (token === 'access-1') throw new AuthError('sessionExpired');
      return token;
    });
    // Signed out while the refresh is still out.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fake.store.clear();
    answer.release();

    await expect(pending).rejects.toMatchObject({ code: 'sessionExpired' });
    expect(fake.held).toBeNull();
    expect(fake.counts.writes).toBe(0);
  });
});

describe('resolveNextStep', () => {
  it('routes on the account', async () => {
    const { repo } = createFakeAuthRepository({ ...COMPLETE_ACCOUNT, profileCompletedAt: null });
    const fake = createFakeSessionStore();
    const resolve = makeResolveNextStep(repo, makeWithSession(repo, fake.store));
    await expect(resolve({ isNew: false })).resolves.toBe('completeProfile');
  });

  it('falls back when the account cannot be read: setup for a new account, home otherwise', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...TEST_SESSION, accessToken: 'offline-access' });
    const resolve = makeResolveNextStep(repo, makeWithSession(repo, fake.store));
    await expect(resolve({ isNew: true })).resolves.toBe('completeProfile');
    await expect(resolve({ isNew: false })).resolves.toBe('home');
  });

  it('does not paper over a dead session', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore({ ...TEST_SESSION, accessToken: 'expired-access', refreshToken: 'stale' });
    const resolve = makeResolveNextStep(repo, makeWithSession(repo, fake.store));
    await expect(resolve({ isNew: false })).rejects.toMatchObject({ code: 'sessionExpired' });
  });
});

describe('acceptTerms', () => {
  it('accepts the version in force, with the stored token, then lets them in', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    await expect(makeAcceptTerms(repo, makeWithSession(repo, fake.store))()).resolves.toBe('home');
    expect(calls.acceptTerms).toEqual([['access-1', TERMS_IN_FORCE]]);
  });

  it('goes on to profile setup when that is still outstanding', async () => {
    const { repo } = createFakeAuthRepository({ ...COMPLETE_ACCOUNT, profileCompletedAt: null });
    const fake = createFakeSessionStore();
    await expect(makeAcceptTerms(repo, makeWithSession(repo, fake.store))()).resolves.toBe('completeProfile');
  });

  it('does not send them back to the terms on a stale read of the account', async () => {
    // The API just answered 204; a GET /me that has not caught up must not loop them.
    const { repo } = createFakeAuthRepository({ ...COMPLETE_ACCOUNT, termsUpToDate: false });
    const fake = createFakeSessionStore();
    await expect(makeAcceptTerms(repo, makeWithSession(repo, fake.store))()).resolves.toBe('home');
  });

  it('fetches the current version and retries once when the remembered one is out of date', async () => {
    const { repo, calls } = createFakeAuthRepository(COMPLETE_ACCOUNT, { staleTerms: true });
    const fake = createFakeSessionStore();
    await expect(makeAcceptTerms(repo, makeWithSession(repo, fake.store))()).resolves.toBe('home');
    expect(calls.termsReads).toEqual([false, true]);
    expect(calls.acceptTerms).toEqual([
      ['access-1', '2025-06-01'],
      ['access-1', TERMS_IN_FORCE],
    ]);
  });
});

describe('Google and Apple', () => {
  it('signs in or up through the provider', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeSignInWithProvider(repo)('apple')).resolves.toMatchObject({ isNew: true });
    expect(calls.provider).toEqual(['apple']);
  });

  it('hands over the challenge when the email already has an account', async () => {
    const { repo } = createFakeAuthRepository();
    await expect(makeSignInWithProvider(repo)('google')).rejects.toMatchObject({
      code: 'accountLinkRequired',
      challengeId: 'challenge-1',
    });
  });

  it('finishes a link with the emailed code', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeCompleteAccountLink(repo)('challenge-1', '123456')).resolves.toEqual(TEST_SESSION);
    expect(calls.link).toEqual([['challenge-1', '123456']]);
  });

  it('refuses a malformed code or a missing challenge without calling the backend', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeCompleteAccountLink(repo)('challenge-1', '12a')).rejects.toMatchObject({
      code: 'invalidCode',
    });
    await expect(makeCompleteAccountLink(repo)('', '123456')).rejects.toMatchObject({ code: 'linkFailed' });
    expect(calls.link).toHaveLength(0);
  });
});
