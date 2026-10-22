import { describe, expect, it } from '@jest/globals';

import {
  splitFullName,
  toAccount,
  toAuthSession,
  toSignUpRequest,
  toVerifiedAuthSession,
} from '../mappers/authMappers';

/**
 * The mappers are the seam between the API's vocabulary and the app's, so these
 * pin the field names the API actually expects — verified against the live
 * endpoint, which accepts this exact body.
 */

describe('splitFullName', () => {
  it('treats the first word as the first name', () => {
    expect(splitFullName('Sarah Mitchell')).toEqual({ firstName: 'Sarah', lastName: 'Mitchell' });
  });

  it('splits on the first space, as the screen-to-API map specifies', () => {
    expect(splitFullName('Mary Jane Watson')).toEqual({
      firstName: 'Mary',
      lastName: 'Jane Watson',
    });
  });

  it('puts a single word in the first name', () => {
    expect(splitFullName('Prince')).toEqual({ firstName: 'Prince', lastName: '' });
  });

  it('ignores stray whitespace', () => {
    expect(splitFullName('  Sarah   Mitchell  ')).toEqual({
      firstName: 'Sarah',
      lastName: 'Mitchell',
    });
    expect(splitFullName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});

describe('toSignUpRequest', () => {
  it('sends the field names the API documents', () => {
    const body = toSignUpRequest(
      {
        email: 'sarah@gmail.com',
        fullName: 'Sarah Mitchell',
        dateOfBirth: '1994-03-15',
        password: 'Travel2026',
      },
      { timezone: 'Europe/London' },
    );

    expect(body).toEqual({
      email: 'sarah@gmail.com',
      password: 'Travel2026',
      firstName: 'Sarah',
      lastName: 'Mitchell',
      dob: '1994-03-15',
      timezone: 'Europe/London',
    });
  });

  it('leaves the timezone out when it is unknown', () => {
    expect(toSignUpRequest({
      email: 'a@b.co', fullName: 'A B', dateOfBirth: '1990-01-01', password: 'Travel2026',
    })).not.toHaveProperty('timezone');
  });
});

describe('session mapping', () => {
  const dto = {
    accessToken: 'a',
    refreshToken: 'r',
    accessExpiresAt: '2026-01-01T00:00:00.000Z',
    sessionId: 's',
  };

  it('maps a sign-in, which carries no profile', () => {
    expect(toAuthSession(dto)).toEqual({ ...dto, userId: null, isNew: false });
  });

  it('maps a verified code, which carries the user and whether they are new', () => {
    expect(toVerifiedAuthSession({ ...dto, isNew: true, user: { id: 'u1' } })).toEqual({
      ...dto,
      userId: 'u1',
      isNew: true,
    });
  });
});

describe('toAccount', () => {
  const me = {
    id: 'u1',
    email: 'sarah@gmail.com',
    firstName: 'Sarah',
    lastName: 'Mitchell',
    profileCompletedAt: null,
    termsUpToDate: true,
  };

  it('keeps an unfinished profile unfinished', () => {
    expect(toAccount(me)).toEqual(me);
  });

  it('only asks for the terms when the API says they are out of date', () => {
    expect(toAccount({ ...me, termsUpToDate: false }).termsUpToDate).toBe(false);
    // A missing flag is a contract break, not a reason to trap someone on a terms screen.
    expect(toAccount({ ...me, termsUpToDate: undefined as unknown as boolean }).termsUpToDate).toBe(true);
  });
});
