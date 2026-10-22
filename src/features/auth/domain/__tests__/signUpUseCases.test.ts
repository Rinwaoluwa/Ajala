import { describe, expect, it } from '@jest/globals';

import type { SignUpDetails } from '../entities/SignUpDetails';
import { makeStartEmailSignUp } from '../usecases/StartEmailSignUpUseCase';
import { makeVerifyEmail } from '../usecases/VerifyEmailUseCase';
import { createFakeAuthRepository } from './authTestDoubles';

/**
 * Use cases against an in-memory fake, so a failure here is a domain bug rather
 * than a network one.
 */

const NOW = () => new Date(2026, 8, 25);

const DETAILS: SignUpDetails = {
  email: ' Sarah.Mitchell@Gmail.com ',
  fullName: 'Sarah Mitchell',
  dateOfBirth: '1994-03-15',
  password: 'Travel2026',
};

describe('start email sign-up', () => {
  it('sends normalised details and returns the pending verification', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const verification = await makeStartEmailSignUp(repo, NOW)(DETAILS);

    expect(calls.signUp[0]?.email).toBe('sarah.mitchell@gmail.com');
    expect(verification).toEqual({ email: 'sarah.mitchell@gmail.com', codeLength: 6 });
  });

  it('refuses details that break the rules without calling the backend', async () => {
    const { repo, calls } = createFakeAuthRepository();
    const start = makeStartEmailSignUp(repo, NOW);

    await expect(start({ ...DETAILS, password: 'weak' })).rejects.toMatchObject({ code: 'invalidDetails' });
    expect(calls.signUp).toHaveLength(0);
  });
});

describe('verify email', () => {
  it('passes a well-formed code to the backend', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeVerifyEmail(repo)('sarah@gmail.com', '144321');
    expect(calls.verify).toEqual([['sarah@gmail.com', '144321']]);
  });

  it('sends the account password with the code', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeVerifyEmail(repo)('sarah@gmail.com', '144321', 'Travel2026');
    expect(calls.verifyPassword).toEqual(['Travel2026']);
  });

  it('sends no password when none is known', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await makeVerifyEmail(repo)('sarah@gmail.com', '144321', '');
    expect(calls.verifyPassword).toEqual([undefined]);
  });

  it('rejects a malformed code locally', async () => {
    const { repo, calls } = createFakeAuthRepository();
    await expect(makeVerifyEmail(repo)('sarah@gmail.com', '1443')).rejects.toMatchObject({ code: 'invalidCode' });
    expect(calls.verify).toHaveLength(0);
  });

  it('passes the backend rejection through', async () => {
    const { repo } = createFakeAuthRepository();
    await expect(makeVerifyEmail(repo)('sarah@gmail.com', '000000')).rejects.toMatchObject({ code: 'invalidCode' });
  });
});
