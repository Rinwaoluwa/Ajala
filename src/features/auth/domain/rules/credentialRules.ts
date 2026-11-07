/**
 * Validation shared by every auth flow, as pure functions.
 *
 * FRD MOB-001 states the password rules — minimum 8 characters, 1 uppercase,
 * 1 digit — and MOB-005/MOB-006 reuse them for sign-in and password reset. This
 * is the only place they are written down, so the checklist on screen, the
 * "can I submit?" guard and the use case can never disagree.
 *
 * The API's length limits (spec §4) are checked here too, from `fieldLimits`:
 * a value over them would be refused by the server anyway.
 *
 * Everything here is synchronous and free of React and I/O, so it is tested
 * directly. Sign-up's own extra rules live in `signUpRules`.
 */

import { fieldLimits } from './fieldLimits';

export const PASSWORD_MIN_LENGTH = fieldLimits.passwordMin;
export const PASSWORD_MAX_LENGTH = fieldLimits.passwordMax;
export const VERIFICATION_CODE_LENGTH = 6;

/**
 * How long after a code is sent before another may be asked for. The API
 * rate-limits resends in 60-second windows (and to 3 codes an hour per address),
 * so offering it sooner only produces "too many attempts".
 */
export const RESEND_COOLDOWN_SECONDS = 60;

/**
 * The API burns a password-reset code on its fifth wrong try (spec §2.2), after
 * which even the right code fails. Counting them lets the screen stop inviting
 * another guess and ask for a new code instead.
 */
export const RESET_CODE_MAX_ATTEMPTS = 5;

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

/**
 * The API's ceiling (8–128). Not a checklist row — nobody is helped by a
 * "fewer than 128 characters" tick — but a password over it cannot be sent.
 */
export function isPasswordWithinLimit(password: string): boolean {
  return password.length <= PASSWORD_MAX_LENGTH;
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULE_IDS.every((id) => passwordTests[id](password)) && isPasswordWithinLimit(password);
}

/**
 * A deliberately loose shape check: something@something.tld, no spaces. The
 * verification code is what proves the address is real.
 */
export function isEmailValid(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= fieldLimits.emailMax && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}

/** Tidies an address before it leaves the device. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isVerificationCodeValid(code: string): boolean {
  return new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`).test(code);
}

/**
 * Sign-in only checks that something plausible was typed. Whether the password is
 * *correct* is the server's answer, and the rules may have changed since the
 * account was made, so an old password that breaks today's rules must still work.
 */
export function canSubmitSignIn(email: string, password: string): boolean {
  return isEmailValid(email) && password.length > 0 && isPasswordWithinLimit(password);
}

export function passwordsMatch(password: string, confirmation: string): boolean {
  return password === confirmation && password.length > 0;
}

/** A new password has to pass the rules *and* be typed the same way twice. */
export function canSubmitNewPassword(password: string, confirmation: string): boolean {
  return isPasswordValid(password) && passwordsMatch(password, confirmation);
}
