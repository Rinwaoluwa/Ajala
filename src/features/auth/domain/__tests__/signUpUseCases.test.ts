import { describe, expect, it } from '@jest/globals';

import { AuthError } from '../entities/AuthError';
import type { SignUpDetails } from '../entities/SignUpDetails';
import type { AuthRepository } from '../repositories/AuthRepository';
import { makeStartEmailSignUp } from '../usecases/StartEmailSignUpUseCase';
import { makeVerifyEmail } from '../usecases/VerifyEmailUseCase';

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

function createFakeRepository() {
  const calls: { signUp: SignUpDetails[]; verify: [string, string][] } = { signUp: [], verify: [] };
  const repo: AuthRepository = {
    startEmailSignUp: async (details) => {
      calls.signUp.push(details);
      return { verificationId: 'v1', email: details.email, codeLength: 6 };
    },
    verifyEmail: async (id, code) => {
      calls.verify.push([id, code]);
      if (code === '000000') throw new AuthError('invalidCode');
    },
  };
  return { repo, calls };
}

describe('start email sign-up', () => {
  it('sends normalised details and returns the pending verification', async () => {
    const { repo, calls } = createFakeRepository();
    const verification = await makeStartEmailSignUp(repo, NOW)(DETAILS);

    expect(calls.signUp[0]?.email).toBe('sarah.mitchell@gmail.com');
    expect(verification).toEqual({ verificationId: 'v1', email: 'sarah.mitchell@gmail.com', codeLength: 6 });
  });

  it('refuses details that break the rules without calling the backend', async () => {
    const { repo, calls } = createFakeRepository();
    const start = makeStartEmailSignUp(repo, NOW);

    await expect(start({ ...DETAILS, password: 'weak' })).rejects.toMatchObject({ code: 'invalidDetails' });
    expect(calls.signUp).toHaveLength(0);
  });
});

describe('verify email', () => {
  it('passes a well-formed code to the backend', async () => {
    const { repo, calls } = createFakeRepository();
    await makeVerifyEmail(repo)('v1', '144321');
    expect(calls.verify).toEqual([['v1', '144321']]);
  });

  it('rejects a malformed code locally', async () => {
    const { repo, calls } = createFakeRepository();
    await expect(makeVerifyEmail(repo)('v1', '1443')).rejects.toMatchObject({ code: 'invalidCode' });
    expect(calls.verify).toHaveLength(0);
  });

  it('passes the backend rejection through', async () => {
    const { repo } = createFakeRepository();
    await expect(makeVerifyEmail(repo)('v1', '000000')).rejects.toMatchObject({ code: 'invalidCode' });
  });
});
