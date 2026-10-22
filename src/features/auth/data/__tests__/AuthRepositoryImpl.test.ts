import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { authApi } from '../datasources/remote/authApi';
import { createAuthRepository } from '../repositories/AuthRepositoryImpl';

/**
 * The repository against a stubbed `authApi`, so these pin what it SENDS and how
 * it reads the answers, without a network or the native sign-in SDKs.
 */

jest.mock('../datasources/remote/authApi', () => ({
  authApi: {
    signUpWithEmail: jest.fn(),
    verifyOtp: jest.fn(),
    acceptTerms: jest.fn(),
    resetPassword: jest.fn(),
  },
}));
jest.mock('../datasources/native/googleIdentity', () => ({
  forgetGoogleAccount: jest.fn(),
  isGoogleSignInConfigured: () => false,
  requestGoogleIdToken: jest.fn(),
}));
jest.mock('../datasources/native/nonce', () => ({ createNonce: jest.fn() }));

const api = authApi as unknown as {
  signUpWithEmail: jest.Mock<(...args: unknown[]) => Promise<void>>;
  verifyOtp: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  acceptTerms: jest.Mock<(...args: unknown[]) => Promise<void>>;
  resetPassword: jest.Mock<(...args: unknown[]) => Promise<void>>;
};

const VERIFIED = {
  accessToken: 'a',
  refreshToken: 'r',
  accessExpiresAt: '2026-01-01T00:00:00.000Z',
  sessionId: 's',
  isNew: true,
  user: { id: 'u1' },
};

const termsRejection = (field: string) =>
  new ApiError({
    code: 'VALIDATION_FAILED',
    message: 'Validation failed',
    status: 400,
    fieldErrors: [{ field, message: 'That is not the current version of the terms' }],
  });

beforeEach(() => {
  jest.clearAllMocks();
});

describe('sign-up', () => {
  const details = {
    email: 'sarah@gmail.com',
    fullName: 'Sarah Mitchell',
    dateOfBirth: '1994-03-15',
    password: 'Travel2026',
  };

  it('resolves the same whether or not the address has an account (202 either way)', async () => {
    api.signUpWithEmail.mockResolvedValue(undefined);
    await expect(createAuthRepository().signUpWithEmail(details)).resolves.toEqual({
      email: 'sarah@gmail.com',
      codeLength: 6,
    });
  });

  it('retries once with a fresh terms version when the remembered one is out of date', async () => {
    api.signUpWithEmail.mockRejectedValueOnce(termsRejection('termsVersion')).mockResolvedValueOnce(undefined);
    await createAuthRepository().signUpWithEmail(details);
    expect(api.signUpWithEmail).toHaveBeenCalledTimes(2);
    expect(api.signUpWithEmail.mock.calls[1]?.[1]).toEqual({ freshTerms: true });
  });

  it('does not retry for other validation failures', async () => {
    api.signUpWithEmail.mockRejectedValue(termsRejection('email'));
    await expect(createAuthRepository().signUpWithEmail(details)).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    expect(api.signUpWithEmail).toHaveBeenCalledTimes(1);
  });

  it('reports a breached password as such', async () => {
    api.signUpWithEmail.mockRejectedValue(
      new ApiError({ code: 'PASSWORD_BREACHED', message: 'x', status: 400 }),
    );
    await expect(createAuthRepository().signUpWithEmail(details)).rejects.toMatchObject({
      code: 'passwordBreached',
    });
  });
});

describe('verifying a code', () => {
  it('sends the password when it completes a sign-up', async () => {
    api.verifyOtp.mockResolvedValue(VERIFIED);
    await createAuthRepository().verifyEmailCode('sarah@gmail.com', '144321', 'Travel2026');
    expect(api.verifyOtp).toHaveBeenCalledWith({ target: 'sarah@gmail.com', code: '144321', password: 'Travel2026' });
  });

  it('sends no password field at all otherwise', async () => {
    api.verifyOtp.mockResolvedValue(VERIFIED);
    await createAuthRepository().verifyEmailCode('sarah@gmail.com', '144321');
    expect(api.verifyOtp).toHaveBeenCalledWith({ target: 'sarah@gmail.com', code: '144321' });
  });

  it('reads the 401 as a wrong code', async () => {
    api.verifyOtp.mockRejectedValue(new ApiError({ code: 'UNAUTHORIZED', message: 'Invalid code', status: 401 }));
    await expect(createAuthRepository().verifyEmailCode('sarah@gmail.com', '144321')).rejects.toMatchObject({
      code: 'invalidCode',
    });
  });

  it('maps the session and whether it was a sign-up', async () => {
    api.verifyOtp.mockResolvedValue(VERIFIED);
    await expect(createAuthRepository().verifyEmailCode('sarah@gmail.com', '144321')).resolves.toMatchObject({
      accessToken: 'a',
      userId: 'u1',
      isNew: true,
    });
  });
});

describe('terms and reset', () => {
  it('reports a terms version no longer in force as termsOutdated', async () => {
    api.acceptTerms.mockRejectedValue(termsRejection('version'));
    await expect(createAuthRepository().acceptTerms('access', '2025-06-01')).rejects.toMatchObject({
      code: 'termsOutdated',
    });
  });

  it('reads a 401 on accepting terms as a dead token, to be refreshed', async () => {
    api.acceptTerms.mockRejectedValue(new ApiError({ code: 'UNAUTHORIZED', message: 'x', status: 401 }));
    await expect(createAuthRepository().acceptTerms('access', '2026-01-01')).rejects.toMatchObject({
      code: 'sessionExpired',
    });
  });

  it('reads a 401 on the reset as a dead link', async () => {
    api.resetPassword.mockRejectedValue(new ApiError({ code: 'UNAUTHORIZED', message: 'x', status: 401 }));
    await expect(createAuthRepository().resetPassword('token', 'Travel2026')).rejects.toMatchObject({
      code: 'expiredCode',
    });
  });
});
