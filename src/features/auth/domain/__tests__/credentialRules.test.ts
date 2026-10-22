import { describe, expect, it } from '@jest/globals';

import {
  canSubmitNewPassword,
  canSubmitSignIn,
  isEmailValid,
  isPasswordValid,
  isPasswordWithinLimit,
  normalizeEmail,
  passwordsMatch,
} from '../rules/credentialRules';
import { fitToLimit } from '../rules/fieldLimits';

/**
 * The password and email predicates themselves are covered in signUpRules.test;
 * these are the rules the sign-in and reset flows add.
 */

describe('sign-in form', () => {
  it('needs a well-formed email and some password', () => {
    expect(canSubmitSignIn('sarah@gmail.com', 'x')).toBe(true);
    expect(canSubmitSignIn('sarah@gmail.com', '')).toBe(false);
    expect(canSubmitSignIn('sarah', 'Travel2026')).toBe(false);
  });

  it('accepts a password that would fail the sign-up rules', () => {
    // An account made before the rules changed still has to be able to sign in.
    expect(canSubmitSignIn('sarah@gmail.com', 'old')).toBe(true);
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail('  Sarah.Mitchell@Gmail.com ')).toBe('sarah.mitchell@gmail.com');
  });
});

describe('new password', () => {
  it('needs the rules met and both fields the same', () => {
    expect(canSubmitNewPassword('Travel2026', 'Travel2026')).toBe(true);
    expect(canSubmitNewPassword('Travel2026', 'Travel2027')).toBe(false);
    expect(canSubmitNewPassword('weak', 'weak')).toBe(false);
  });

  it('does not treat two empty fields as matching', () => {
    expect(passwordsMatch('', '')).toBe(false);
    expect(canSubmitNewPassword('', '')).toBe(false);
  });
});

describe('API field limits (spec §4)', () => {
  const longEmail = `${'a'.repeat(310)}@gmail.com`; // 320 characters
  it('takes an address up to 320 characters, and no longer', () => {
    expect(isEmailValid(longEmail)).toBe(true);
    expect(isEmailValid(`a${longEmail}`)).toBe(false);
  });

  it('takes a password up to 128 characters, and no longer', () => {
    const atLimit = `Travel2026${'x'.repeat(118)}`;
    expect(atLimit).toHaveLength(128);
    expect(isPasswordValid(atLimit)).toBe(true);
    expect(isPasswordWithinLimit(`${atLimit}x`)).toBe(false);
    expect(isPasswordValid(`${atLimit}x`)).toBe(false);
    expect(canSubmitSignIn('sarah@gmail.com', `${atLimit}x`)).toBe(false);
    expect(canSubmitNewPassword(`${atLimit}x`, `${atLimit}x`)).toBe(false);
  });

  it('cuts a value the person did not type to fit, rather than failing on it', () => {
    expect(fitToLimit('  Ada  ', 60)).toBe('Ada');
    expect(fitToLimit('x'.repeat(61), 60)).toHaveLength(60);
    expect(fitToLimit('   ', 60)).toBeUndefined();
    expect(fitToLimit(undefined, 60)).toBeUndefined();
  });
});
