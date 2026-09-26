/**
 * Validation rules for email sign-up, as pure functions.
 *
 * FRD MOB-001: "Password rules: minimum 8 chars, 1 uppercase, 1 digit." These are
 * the only source of those rules; the checklist on screen and the use case both
 * read them, so the two can never disagree.
 *
 * Everything here is synchronous and free of React and I/O, so it is tested
 * directly.
 */

import type { SignUpDetails } from '../entities/SignUpDetails';

export const PASSWORD_MIN_LENGTH = 8;
export const VERIFICATION_CODE_LENGTH = 6;

export type PasswordRuleId = 'minLength' | 'uppercase' | 'digit';

/** In the order the checklist shows them. */
export const PASSWORD_RULE_IDS: readonly PasswordRuleId[] = ['minLength', 'uppercase', 'digit'];

const passwordTests: Record<PasswordRuleId, (password: string) => boolean> = {
  minLength: (p) => p.length >= PASSWORD_MIN_LENGTH,
  uppercase: (p) => /\p{Lu}/u.test(p),
  digit: (p) => /\d/.test(p),
};

export function checkPassword(password: string): Record<PasswordRuleId, boolean> {
  return {
    minLength: passwordTests.minLength(password),
    uppercase: passwordTests.uppercase(password),
    digit: passwordTests.digit(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULE_IDS.every((id) => passwordTests[id](password));
}

/**
 * A deliberately loose shape check: something@something.tld, no spaces. The
 * verification code is what proves the address is real.
 */
export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

/** At least two letters. Names vary too much across cultures to check more. */
export function isFullNameValid(name: string): boolean {
  return (name.trim().match(/\p{L}/gu) ?? []).length >= 2;
}

/** A real `YYYY-MM-DD` date that is not after `today`. */
export function isDateOfBirthValid(dateOfBirth: string, today: Date): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects 2023-02-31 and the like, which Date would quietly roll into March.
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return false;
  }
  return dateOfBirth <= toCalendarDate(today);
}

export function isVerificationCodeValid(code: string): boolean {
  return new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code);
}

/** Whether every field is filled in well enough to send. */
export function canSubmitSignUp(details: SignUpDetails, today: Date): boolean {
  return (
    isEmailValid(details.email) &&
    isFullNameValid(details.fullName) &&
    isDateOfBirthValid(details.dateOfBirth, today) &&
    isPasswordValid(details.password)
  );
}

/** Tidies input before it leaves the device. The password is never altered. */
export function normalizeSignUpDetails(details: SignUpDetails): SignUpDetails {
  return {
    ...details,
    email: details.email.trim().toLowerCase(),
    fullName: details.fullName.trim().replace(/\s+/g, ' '),
  };
}

/** The local calendar date of `date`, as `YYYY-MM-DD`. */
export function toCalendarDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
