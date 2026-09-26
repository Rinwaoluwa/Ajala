import type { AuthErrorCode } from '../domain/entities/AuthError';
import type { PasswordRuleId } from '../domain/rules/signUpRules';
import { PASSWORD_MIN_LENGTH } from '../domain/rules/signUpRules';

/**
 * User-facing text for the auth screens, transcribed from the sign-up designs.
 * Kept in one place so a copy change never touches a component.
 */

export const passwordRuleLabels: Record<PasswordRuleId, string> = {
  minLength: `Minimum of ${PASSWORD_MIN_LENGTH} characters`,
  uppercase: 'At least 1 uppercase',
  digit: 'At least 1 digit',
};

export const authErrorMessages: Record<AuthErrorCode, string> = {
  emailTaken: 'An account with this email already exists. Try signing in.',
  invalidCode: "That code doesn't match. Check the email and try again.",
  invalidDetails: 'Some details need another look.',
  network: "We couldn't reach Ajala. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

/** The design shows the address as its first letter, five dots, then the domain. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return email;
  return `${email[0]}•••••${email.slice(at)}`;
}

/** "15 March 1994", as the design writes a date of birth. */
export function formatDateOfBirth(calendarDate: string): string {
  const [y, m, d] = calendarDate.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}
