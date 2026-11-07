import { describe, expect, it, jest } from '@jest/globals';

import { makeRequestPasswordReset } from '../usecases/RequestPasswordResetUseCase';
import { makeResendEmailCode } from '../usecases/ResendEmailCodeUseCase';
import { makeResetPassword } from '../usecases/ResetPasswordUseCase';
import { makeVerifyPasswordResetCode } from '../usecases/VerifyPasswordResetCodeUseCase';
import { makeSignIn } from '../usecases/SignInUseCase';
import {
  makeEndLocalSession,
  makeKeepSession,
  makeRestoreSession,
  makeSignOut,
  makeWithSession,
} from '../usecases/SessionUseCases';
import { makeVerifyEmail } from '../usecases/VerifyEmailUseCase';
import { createFakeAuthRepository, createFakeSessionStore, TEST_SESSION } from './authTestDoubles';

describe('sign in', () => {
  it('normalises the email before sending it', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const session = await makeSignIn(repo)({ email: '  Sarah@Gmail.com ', password: 'Travel2026' });

    expect(calls.signIn[0]?.email).toBe('sarah@gmail.com');
    expect(session).toEqual(TEST_SESSION);
  });

  it('refuses a malformed email without calling the backend', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeSignIn(repo)({ email: 'sarah', password: 'x' })).rejects.toMatchObject({
      code: 'invalidCredentials',
    });
    expect(calls.signIn).toHaveLength(0);
  });

  it('forwards a step-up code, because step-up is a retry of the same call', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeSignIn(repo)({
      email: 'sarah@gmail.com',
      password: 'Travel2026',
      otpCode: '144321',
    });

    expect(calls.signIn[0]?.otpCode).toBe('144321');
  });

  it('refuses a malformed step-up code without calling the backend', async () => {
    // LoginDto.otpCode is six digits; and the credentials already passed, so it is the code that is wrong.
    const { repo, calls } = createFakeAuthRepository();
    await expect(
      makeSignIn(repo)({ email: 'sarah@gmail.com', password: 'Travel2026', otpCode: '12ab' }),
    ).rejects.toMatchObject({ code: 'invalidCode' });
    expect(calls.signIn).toHaveLength(0);
  });

  it('refuses a password over the API limit without calling the backend', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(
      makeSignIn(repo)({ email: 'sarah@gmail.com', password: `A1${'x'.repeat(127)}` }),
    ).rejects.toMatchObject({ code: 'invalidCredentials' });
    expect(calls.signIn).toHaveLength(0);
  });

  it('sends no otpCode when none was asked for', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeSignIn(repo)({ email: 'sarah@gmail.com', password: 'Travel2026' });

    expect(calls.signIn[0]?.otpCode).toBeUndefined();
  });

  it('passes an unverified account through as its own case', async () => {
    // The API re-sends a code for this one, so the screen must send them to the
    // code step rather than show "wrong password".
    const { repo } = createFakeAuthRepository();
    await expect(
      makeSignIn(repo)({ email: 'sarah@gmail.com', password: 'Unverified1' }),
    ).rejects.toMatchObject({ code: 'emailNotVerified' });
  });
});

describe('verify email code', () => {
  it('signs in and reports that the account is new', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const session = await makeVerifyEmail(repo)(' Sarah@Gmail.com ', '144321');

    expect(calls.verify).toEqual([['sarah@gmail.com', '144321']]);
    expect(session.isNew).toBe(true);
    expect(session.accessToken).toBe(TEST_SESSION.accessToken);
  });

  it('rejects a malformed code locally', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeVerifyEmail(repo)('sarah@gmail.com', '1443')).rejects.toMatchObject({
      code: 'invalidCode',
    });
    expect(calls.verify).toHaveLength(0);
  });
});

describe('resend code', () => {
  it('sends to the normalised address', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeResendEmailCode(repo)(' Sarah@Gmail.com ');
    expect(calls.resend).toEqual(['sarah@gmail.com']);
  });
});

describe('request password reset', () => {
  it('normalises the email', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeRequestPasswordReset(repo)(' Sarah@Gmail.com ');
    expect(calls.forgot).toEqual(['sarah@gmail.com']);
  });

  it('rejects a malformed email locally', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeRequestPasswordReset(repo)('nope')).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    expect(calls.forgot).toHaveLength(0);
  });
});

describe('verify password reset code', () => {
  it('trades the code, with the normalised email, for a reset token', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeVerifyPasswordResetCode(repo)(' Sarah@Gmail.com ', '123456')).resolves.toBe(
      'reset-token-1',
    );
    expect(calls.resetCode).toEqual([['sarah@gmail.com', '123456']]);
  });

  it('refuses a malformed code or email without spending one of the five tries', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const verify = makeVerifyPasswordResetCode(repo);
    await expect(verify('sarah@gmail.com', '12345')).rejects.toMatchObject({ code: 'invalidCode' });
    await expect(verify('sarah@gmail.com', 'abcdef')).rejects.toMatchObject({ code: 'invalidCode' });
    await expect(verify('nope', '123456')).rejects.toMatchObject({ code: 'invalidDetails' });
    expect(calls.resetCode).toHaveLength(0);
  });

  it('passes a wrong code back as invalidCode', async () => {
    const { repo } = createFakeAuthRepository();
    await expect(makeVerifyPasswordResetCode(repo)('sarah@gmail.com', '000000')).rejects.toMatchObject({
      code: 'invalidCode',
    });
  });
});

describe('reset password', () => {
  it('sends the token and the new password once both fields agree', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeResetPassword(repo)('token-1', 'Travel2026', 'Travel2026');
    expect(calls.reset).toEqual([['token-1', 'Travel2026']]);
  });

  it('refuses a mismatch, a weak password and a missing token', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const reset = makeResetPassword(repo);

    await expect(reset('token-1', 'Travel2026', 'Travel2027')).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    await expect(reset('token-1', 'weak', 'weak')).rejects.toMatchObject({ code: 'invalidDetails' });
    // No token means the code step never finished: only a new code helps.
    await expect(reset('', 'Travel2026', 'Travel2026')).rejects.toMatchObject({
      code: 'expiredCode',
    });
    expect(calls.reset).toHaveLength(0);
  });

  it('reports a reset token that ran out or was used', async () => {
    const { repo } = createFakeAuthRepository();
    await expect(makeResetPassword(repo)('expired', 'Travel2026', 'Travel2026')).rejects.toMatchObject({
      code: 'expiredCode',
    });
  });

  it('drops this device\'s session afterwards, because a reset signs out every device', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    const onEnded = jest.fn();
    await makeResetPassword(repo, makeEndLocalSession(fake.store, onEnded))('token-1', 'Travel2026', 'Travel2026');
    expect(fake.held).toBeNull();
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the reset fails', async () => {
    const { repo } = createFakeAuthRepository();
    const fake = createFakeSessionStore();
    await expect(
      makeResetPassword(repo, makeEndLocalSession(fake.store))('expired', 'Travel2026', 'Travel2026'),
    ).rejects.toMatchObject({ code: 'expiredCode' });
    expect(fake.held).toEqual(TEST_SESSION);
  });
});

describe('end local session', () => {
  it('does nothing, and tells no one, when no one is signed in', async () => {
    const fake = createFakeSessionStore(null);
    const onEnded = jest.fn();
    await makeEndLocalSession(fake.store, onEnded)();
    expect(onEnded).not.toHaveBeenCalled();
    expect(fake.counts.clears).toBe(0);
  });
});

describe('the session store', () => {
  function createFakeStore(initial: typeof TEST_SESSION | null = null) {
    let held = initial;
    return {
      store: {
        read: async () => held,
        write: async (s: typeof TEST_SESSION) => {
          held = s;
        },
        clear: async () => {
          held = null;
        },
      },
      get held() {
        return held;
      },
    };
  }

  it('restores what was kept', async () => {
    const fake = createFakeStore();
    await makeKeepSession(fake.store)(TEST_SESSION);
    await expect(makeRestoreSession(fake.store)()).resolves.toEqual(TEST_SESSION);
  });

  it('clears the device even when the server call fails', async () => {
    // A dead network must not leave someone stuck signed in.
    const fake = createFakeStore(TEST_SESSION);
    const repo = {
      ...createFakeAuthRepository().repo,
      signOut: async () => {
        throw new Error('network down');
      },
    };
    await expect(makeSignOut(repo, fake.store, makeWithSession(repo, fake.store))()).resolves.toBeUndefined();
    expect(fake.held).toBeNull();
  });

  it('signs out with the stored token, which a refresh may have rotated', async () => {
    const fake = createFakeStore({ ...TEST_SESSION, accessToken: 'rotated-access' });
    const { repo, calls } = createFakeAuthRepository();
    await makeSignOut(repo, fake.store, makeWithSession(repo, fake.store))();
    expect(calls.signOut).toEqual(['rotated-access']);
  });

  it('refreshes a lapsed token first, so the server-side session really ends', async () => {
    // A logout sent with a dead token is a 401, and the session would live on.
    const fake = createFakeSessionStore({ ...TEST_SESSION, accessToken: 'expired-access' });
    const { repo, calls } = createFakeAuthRepository();
    await makeSignOut(repo, fake.store, makeWithSession(repo, fake.store))();
    expect(calls.refresh).toEqual(['refresh-1']);
    expect(calls.signOut).toEqual(['expired-access', 'access-2']);
    expect(fake.held).toBeNull();
  });

  it('runs the before-sign-out work first, while the session still works', async () => {
    // Push unregister needs the session, so it must go before the logout ends it.
    const fake = createFakeStore(TEST_SESSION);
    const { repo, calls } = createFakeAuthRepository();
    const order: string[] = [];
    const before = async () => {
      order.push(`before:${calls.signOut.length}:${fake.held ? 'held' : 'cleared'}`);
    };
    await makeSignOut(repo, fake.store, makeWithSession(repo, fake.store), before)();
    expect(order).toEqual(['before:0:held']);
    expect(calls.signOut).toHaveLength(1);
    expect(fake.held).toBeNull();
  });

  it('signs out even when the before-sign-out work fails', async () => {
    const fake = createFakeStore(TEST_SESSION);
    const { repo, calls } = createFakeAuthRepository();
    const before = async () => {
      throw new Error('network down');
    };
    await expect(
      makeSignOut(repo, fake.store, makeWithSession(repo, fake.store), before)(),
    ).resolves.toBeUndefined();
    expect(calls.signOut).toHaveLength(1);
    expect(fake.held).toBeNull();
  });

  it('skips the before-sign-out work when no one is signed in', async () => {
    const fake = createFakeStore(null);
    const { repo } = createFakeAuthRepository();
    const before = jest.fn(async () => undefined);
    await makeSignOut(repo, fake.store, makeWithSession(repo, fake.store), before)();
    expect(before).not.toHaveBeenCalled();
  });

  it('still clears when there was no session to end', async () => {
    const fake = createFakeStore(null);
    const { repo, calls } = createFakeAuthRepository();
    await makeSignOut(repo, fake.store, makeWithSession(repo, fake.store))();
    expect(calls.signOut).toHaveLength(0);
    expect(fake.held).toBeNull();
  });
});
