import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { AuthError } from '../../domain/entities/AuthError';
import {
  PROVIDER_CALL,
  SESSION_CALL,
  isTermsVersionRejection,
  toAuthError,
  toCodeError,
} from '../mappers/authErrorMapper';

/**
 * The mapping from the API's error codes (spec §5) to what the app can say.
 * Every case branches on `code`; the messages here are deliberately misleading
 * to prove nothing reads them.
 */

const apiError = (init: ConstructorParameters<typeof ApiError>[0]) => new ApiError(init);

describe('toAuthError', () => {
  it('branches on the code, never the message', () => {
    const e = apiError({ code: 'PASSWORD_BREACHED', message: 'Invalid credentials', status: 400 });
    expect(toAuthError(e).code).toBe('passwordBreached');
  });

  it('keeps the field errors, so a form can put them against its inputs', () => {
    const e = apiError({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      status: 400,
      fieldErrors: [{ field: 'lastName', message: 'lastName must be longer than or equal to 1 characters' }],
    });
    expect(toAuthError(e)).toMatchObject({ code: 'invalidDetails', fieldErrors: e.fieldErrors });
  });

  it('carries the ways in with EMAIL_ALREADY_REGISTERED', () => {
    const e = apiError({
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'x',
      status: 409,
      details: { signInMethods: ['google', 'password'] },
    });
    expect(toAuthError(e, PROVIDER_CALL)).toMatchObject({
      code: 'emailAlreadyRegistered',
      signInMethods: ['google', 'password'],
    });
  });

  it('keeps only the sign-in methods it knows, once each', () => {
    const e = apiError({
      code: 'EMAIL_ALREADY_REGISTERED',
      message: 'x',
      status: 409,
      details: { signInMethods: ['apple', 'passkey', 'apple', 7] },
    });
    expect(toAuthError(e, PROVIDER_CALL).signInMethods).toEqual(['apple']);
    const bare = apiError({ code: 'EMAIL_ALREADY_REGISTERED', message: 'x', status: 409 });
    expect(toAuthError(bare, PROVIDER_CALL)).toMatchObject({ code: 'emailAlreadyRegistered', signInMethods: [] });
  });

  it('carries how long to wait with RATE_LIMITED', () => {
    const e = apiError({ code: 'RATE_LIMITED', message: 'x', status: 429, retryAfterSeconds: 42 });
    expect(toAuthError(e)).toMatchObject({ code: 'rateLimited', retryAfterSeconds: 42 });
  });

  it('maps SIGNUP_REFUSED from Google/Apple to its own vague message, not a generic failure', () => {
    const e = apiError({ code: 'SIGNUP_REFUSED', message: 'Email taken', status: 403 });
    expect(toAuthError(e, PROVIDER_CALL).code).toBe('signUpRefused');
  });

  it('never turns a conflict into "that email is taken"', () => {
    // Sign-up must not reveal whether an address has an account (spec §2.2).
    expect(toAuthError(apiError({ code: 'CONFLICT', message: 'x', status: 409 })).code).toBe('unknown');
  });

  it('reads a 401 by where it came from', () => {
    const e = apiError({ code: 'UNAUTHORIZED', message: 'x', status: 401 });
    expect(toAuthError(e).code).toBe('invalidCredentials');
    expect(toAuthError(e, SESSION_CALL).code).toBe('sessionExpired');
    expect(toAuthError(e, PROVIDER_CALL).code).toBe('providerRejected');
  });

  it('reports the transport failing as a network problem', () => {
    expect(toAuthError(apiError({ code: 'NETWORK', message: 'x' })).code).toBe('network');
    expect(toAuthError(apiError({ code: 'TIMEOUT', message: 'x' })).code).toBe('network');
  });

  it('passes its own errors through and calls anything else unknown', () => {
    const own = new AuthError('cancelled');
    expect(toAuthError(own)).toBe(own);
    expect(toAuthError(new Error('boom')).code).toBe('unknown');
  });
});

describe('toCodeError', () => {
  it('reads the 401 as a bad code, as the OpenAPI document has it', () => {
    const e = apiError({ code: 'UNAUTHORIZED', message: 'Invalid code', status: 401 });
    expect(toCodeError(e, 'invalidCode').code).toBe('invalidCode');
    expect(toCodeError(e, 'expiredCode').code).toBe('expiredCode');
  });

  it('reads a 400 about the code alone as a bad code', () => {
    const e = apiError({
      code: 'VALIDATION_FAILED',
      message: 'x',
      status: 400,
      fieldErrors: [{ field: 'code', message: 'code must match /^\\d{6}$/' }],
    });
    expect(toCodeError(e, 'invalidCode').code).toBe('invalidCode');
  });

  it('does not blame the code for a 400 about something else', () => {
    // "Wrong code" here would have someone retype a right code forever.
    const e = apiError({
      code: 'VALIDATION_FAILED',
      message: 'x',
      status: 400,
      fieldErrors: [{ field: 'password', message: 'property password should not exist' }],
    });
    expect(toCodeError(e, 'invalidCode').code).toBe('invalidDetails');
  });
});

describe('isTermsVersionRejection', () => {
  const rejection = (field: string) =>
    apiError({
      code: 'VALIDATION_FAILED',
      message: 'x',
      status: 400,
      fieldErrors: [{ field, message: 'That is not the current version of the terms' }],
    });

  it('recognises a 400 about the terms version alone', () => {
    expect(isTermsVersionRejection(rejection('version'), 'version')).toBe(true);
    expect(isTermsVersionRejection(rejection('termsVersion'), 'termsVersion')).toBe(true);
  });

  it('ignores other validation failures', () => {
    expect(isTermsVersionRejection(rejection('email'), 'termsVersion')).toBe(false);
    expect(isTermsVersionRejection(apiError({ code: 'VALIDATION_FAILED', message: 'x' }), 'version')).toBe(false);
  });
});
