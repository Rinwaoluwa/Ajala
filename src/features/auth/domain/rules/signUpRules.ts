/**
 * Validation rules specific to the sign-up form, as pure functions.
 *
 * The email, password and verification-code rules are shared with sign-in and
 * password reset, so they live in `credentialRules` and are re-exported here —
 * the sign-up screens import from one module and there is still one definition.
 *
 * Everything here is synchronous and free of React and I/O, so it is tested
 * directly.
 */

import type { SignUpDetails } from '../entities/SignUpDetails';
import { isEmailValid, isPasswordValid } from './credentialRules';
import { fieldLimits } from './fieldLimits';

export {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  isPasswordWithinLimit,
  VERIFICATION_CODE_LENGTH,
  PASSWORD_RULE_IDS,
  checkPassword,
  isPasswordValid,
  isEmailValid,
  isVerificationCodeValid,
  type PasswordRuleId,
} from './credentialRules';

/** At least two letters. Names vary too much across cultures to check more. */
export function isFullNameValid(name: string): boolean {
  return fullNameProblem(name) === null;
}

/**
 * What is wrong with a full name, so the field can say which fix it needs:
 *   - `incomplete`: fewer than two words, or a "word" with no letter in it;
 *   - `tooLong`: the first name, or the rest, is over the API's 60 characters
 *     (`SignupEmailDto.firstName` / `lastName`). Measured the way the mapper
 *     splits it — first word, then everything after.
 */
export type FullNameProblem = 'incomplete' | 'tooLong';

export function fullNameProblem(name: string): FullNameProblem | null {
  const parts = splitName(name);
  if (parts.length < 2 || !parts.every((part) => /\p{L}/u.test(part))) return 'incomplete';
  const [first, ...rest] = parts;
  if (first.length > fieldLimits.nameMax || rest.join(' ').length > fieldLimits.nameMax) return 'tooLong';
  return null;
}

/**
 * The words of a name, with runs of whitespace collapsed.
 *
 * The form asks for one "Full Name" but the API stores a first and a last name
 * and rejects an empty one, so a single word cannot be sent. The screen asks for
 * both rather than inventing a surname or letting the server refuse the form.
 */
export function splitName(name: string): string[] {
  return name.trim().split(/\s+/).filter(Boolean);
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
