import { describe, expect, it } from '@jest/globals';

import {
  canSubmitSignUp,
  checkPassword,
  isDateOfBirthValid,
  isEmailValid,
  fullNameProblem,
  isFullNameValid,
  isPasswordValid,
  isVerificationCodeValid,
  normalizeSignUpDetails,
  toCalendarDate,
} from '../rules/signUpRules';

/** FRD MOB-001: minimum 8 characters, 1 uppercase, 1 digit. */

const TODAY = new Date(2026, 8, 25);

const VALID = {
  email: 'sarah.mitchell@gmail.com',
  fullName: 'Sarah Mitchell',
  dateOfBirth: '1994-03-15',
  password: 'Travel2026',
};

describe('password rules', () => {
  it('reports each rule separately, for the checklist', () => {
    expect(checkPassword('')).toEqual({ minLength: false, uppercase: false, digit: false });
    expect(checkPassword('abcdefgh')).toEqual({ minLength: true, uppercase: false, digit: false });
    expect(checkPassword('Abcdefgh')).toEqual({ minLength: true, uppercase: true, digit: false });
    expect(checkPassword('Abc1')).toEqual({ minLength: false, uppercase: true, digit: true });
  });

  it('needs all three to pass', () => {
    expect(isPasswordValid('Abcdefg1')).toBe(true);
    expect(isPasswordValid('abcdefg1')).toBe(false);
    expect(isPasswordValid('Abcdefgh')).toBe(false);
    expect(isPasswordValid('Abcdef1')).toBe(false);
  });

  it('counts accented capitals as uppercase', () => {
    expect(checkPassword('Élodie12').uppercase).toBe(true);
  });
});

describe('email', () => {
  it('accepts ordinary addresses and trims surrounding space', () => {
    expect(isEmailValid('a@b.co')).toBe(true);
    expect(isEmailValid('  sarah@gmail.com ')).toBe(true);
  });

  it('rejects the obvious mistakes', () => {
    expect(isEmailValid('sarah')).toBe(false);
    expect(isEmailValid('sarah@gmail')).toBe(false);
    expect(isEmailValid('sa rah@gmail.com')).toBe(false);
  });
});

describe('full name', () => {
  it('needs a first and a last name, in any script', () => {
    expect(isFullNameValid('Sarah Mitchell')).toBe(true);
    expect(isFullNameValid('Adébáyọ̀ Okonkwo')).toBe(true);
    expect(isFullNameValid('李 明')).toBe(true);
    expect(isFullNameValid('  Mary   Jane  Watson ')).toBe(true);
    expect(isFullNameValid(' A ')).toBe(false);
    expect(isFullNameValid('12 34')).toBe(false);
  });

  /**
   * The API stores a first and a last name and rejects an empty one, so a name
   * written as a single word cannot be sent at all. That excludes mononyms and
   * the many names normally written without a space. Asking for the two parts is
   * the least-bad thing the client can do about it — the fix is on the API, or in
   * a form that asks for both plainly. Recorded here so the exclusion is a known
   * decision rather than a surprise.
   */
  it('rejects a single-word name, which the API cannot store', () => {
    expect(isFullNameValid('Adébáyọ̀')).toBe(false);
    expect(isFullNameValid('李明')).toBe(false);
  });

  it('holds each part to the API\'s 60 characters, split the way the mapper splits it', () => {
    const sixty = 'a'.repeat(60);
    expect(fullNameProblem(`${sixty} ${sixty}`)).toBeNull();
    expect(fullNameProblem(`${sixty}a Smith`)).toBe('tooLong');
    // The last name is everything after the first word, spaces included.
    expect(fullNameProblem(`Mary ${'b'.repeat(30)} ${'c'.repeat(30)}`)).toBe('tooLong');
    expect(isFullNameValid(`${sixty}a Smith`)).toBe(false);
  });

  it('says a name is incomplete rather than too long when it is both one word and long', () => {
    expect(fullNameProblem('a'.repeat(80))).toBe('incomplete');
  });
});

describe('date of birth', () => {
  it('accepts a real past date', () => {
    expect(isDateOfBirthValid('1994-03-15', TODAY)).toBe(true);
    expect(isDateOfBirthValid(toCalendarDate(TODAY), TODAY)).toBe(true);
  });

  it('rejects impossible and future dates', () => {
    expect(isDateOfBirthValid('2023-02-31', TODAY)).toBe(false);
    expect(isDateOfBirthValid('2027-01-01', TODAY)).toBe(false);
    expect(isDateOfBirthValid('15/03/1994', TODAY)).toBe(false);
    expect(isDateOfBirthValid('', TODAY)).toBe(false);
  });
});

describe('verification code', () => {
  it('is exactly six digits', () => {
    expect(isVerificationCodeValid('144321')).toBe(true);
    expect(isVerificationCodeValid('14432')).toBe(false);
    expect(isVerificationCodeValid('14432a')).toBe(false);
  });
});

describe('sign-up form', () => {
  it('cannot be sent with a password over 128 characters', () => {
    expect(canSubmitSignUp({ ...VALID, password: `Travel2026${'x'.repeat(119)}` }, TODAY)).toBe(false);
  });

  it('can be sent only when every field passes', () => {
    expect(canSubmitSignUp(VALID, TODAY)).toBe(true);
    expect(canSubmitSignUp({ ...VALID, email: 'nope' }, TODAY)).toBe(false);
    expect(canSubmitSignUp({ ...VALID, fullName: '' }, TODAY)).toBe(false);
    expect(canSubmitSignUp({ ...VALID, dateOfBirth: '' }, TODAY)).toBe(false);
    expect(canSubmitSignUp({ ...VALID, password: 'short' }, TODAY)).toBe(false);
  });

  it('tidies email and name but never the password', () => {
    const tidy = normalizeSignUpDetails({
      ...VALID,
      email: '  Sarah.Mitchell@Gmail.com ',
      fullName: '  Sarah   Mitchell ',
      password: ' Travel2026 ',
    });
    expect(tidy.email).toBe('sarah.mitchell@gmail.com');
    expect(tidy.fullName).toBe('Sarah Mitchell');
    expect(tidy.password).toBe(' Travel2026 ');
  });
});
