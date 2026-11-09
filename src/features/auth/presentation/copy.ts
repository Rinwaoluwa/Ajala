import { formatCountdown } from '@shared/hooks/useCountdown';

import type { SignInMethod } from '../domain/entities/Account';
import type { AuthErrorCode } from '../domain/entities/AuthError';
import type { PasswordRuleId } from '../domain/rules/credentialRules';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../domain/rules/credentialRules';
import { fieldLimits } from '../domain/rules/fieldLimits';

/**
 * User-facing text for the auth screens, transcribed from the auth designs
 * (Create account, Verification, Forgot password, modal-8). Sentence case
 * throughout, as the designs set it. Kept in one place so a copy change never
 * touches a component.
 */

export const passwordRuleLabels: Record<PasswordRuleId, string> = {
  minLength: `At least ${PASSWORD_MIN_LENGTH} characters`,
  uppercase: 'At least 1 uppercase letter',
  digit: 'At least 1 number',
};

/** The fields the auth forms share, so a label reads the same on every screen. */
export const fieldCopy = {
  email: { label: 'Email address', placeholder: 'Enter your email address' },
  fullName: { label: 'Full name', placeholder: 'Enter your full name' },
  dateOfBirth: { label: 'Date of birth', placeholder: 'Select your date of birth' },
} as const;

/** Create account, step 1 (Figma "Create account"). */
export const signUpDetailsCopy = {
  header: 'Create account',
  title: 'Sign up to meet travellers',
  body: 'Create your account and start connecting with travellers around the world.',
  password: { label: 'Password', placeholder: 'Create your password' },
  submit: 'Continue',
} as const;

/** Every six-digit-code screen (Figma "Verification"). */
export const codeEntryCopy = {
  title: 'Verification',
  submit: 'Verify code',
  resendPrompt: "Didn't get the code?",
  resendLink: 'Resend code',
  resendWaiting: (countdown: string) => `Resend in ${countdown}`,
  resendWaitingLabel: (seconds: number) => `You can ask for a new code in ${seconds} seconds`,
} as const;

/** Create account, step 2, and its two sheets (modal-8). */
export const verifyEmailCopy = {
  /** Followed by the masked address, which the design sets apart. */
  body: (length: number) => `We sent a ${length}-digit verification code to`,
  fallbackRecipient: 'your email',
  verified: {
    title: 'Email verified!',
    message: "Your email is verified. Let's set up your profile.",
    action: 'Continue',
  },
  failed: {
    title: 'Email verification failed',
    message: "We couldn't verify your email. Check your code and try again.",
    action: 'Try again',
  },
} as const;

/** The password reset (Figma "Forgot password", "Verification" and "Create a new password"). */
export const passwordResetCopy = {
  header: 'Forgot password',
  request: {
    title: 'Forgot password?',
    body: "Enter your email and we'll send you a code to reset your password.",
    submit: 'Send code',
    footerPrompt: 'Remember your password?',
    footerLink: 'Sign in',
  },
  verify: {
    // "If that address has an account": the API answers the same either way, so
    // the screen must not confirm that an account exists. Followed by the masked
    // address, which the design sets apart.
    body: (length: number) => `If that address has an account, we sent a ${length}-digit code to`,
    fallbackRecipient: 'your email',
  },
  newPassword: {
    title: 'Create a new password',
    body: "Choose a strong password you haven't used before.",
    password: { label: 'New password', placeholder: 'Enter your new password' },
    confirmation: { label: 'Confirm password', placeholder: 'Re-enter your new password' },
    mismatch: 'Both passwords need to match.',
    submit: 'Reset password',
  },
  // The API's 401 on the reset (spec §3.2): the token the code bought lasts 15
  // minutes and works once. Retyping the password cannot fix that; a new code can.
  expired: {
    title: 'Your reset timed out',
    message:
      'For your security, a new password has to be set within 15 minutes of entering the code. Ask for a new code to try again.',
    action: 'Get a new code',
  },
  done: {
    title: 'Password reset successful',
    // A reset signs out every device (spec §2.2), so say so: someone signed in
    // on a tablet should not be surprised to find it signed out.
    message:
      "Your password has been updated and you've been signed out on all your devices. Sign in with your new password.",
    action: 'Sign in',
  },
} as const;

/** Sign in with email and password, and its step-up code (Figma "Sign In"). */
export const signInCopy = {
  header: 'Sign in',
  title: 'Welcome back, traveler',
  body: 'Sign in to continue discovering places and connecting with travellers.',
  // The design's placeholder reads "Create your password", which belongs to the
  // sign-up screen. Flagged to design.
  password: { label: 'Password', placeholder: 'Enter your password' },
  forgotPassword: 'Forgot password?',
  submit: 'Sign in',
  stepUpBody: (length: number, recipient: string) =>
    `To keep your account safe, we sent a ${length}-digit code to ${recipient}. Enter it to finish signing in.`,
  stepUpFallbackRecipient: 'your email',
} as const;

/**
 * Google or Apple found an account with that email that signs in another way
 * (409 EMAIL_ALREADY_REGISTERED). Not drawn; a native alert, like the other
 * provider failures. It names the ways in the API listed; with none, it says
 * only that the account exists.
 */
export const emailRegisteredCopy = {
  title: 'You already have an account',
  message: (methods: readonly SignInMethod[]) =>
    methods.length === 0
      ? 'This email already has an account.'
      : `This email already has an account. Sign in with ${orList(methods.map((m) => signInMethodNames[m]))} instead.`,
  button: (method: SignInMethod) => (method === 'password' ? 'Sign in with email' : `Sign in with ${providerNames[method]}`),
  dismiss: 'Not now',
} as const;

const signInMethodNames: Record<SignInMethod, string> = {
  google: 'Google',
  apple: 'Apple',
  password: 'your email and password',
};

/** "Google", "Google or Apple", "Google, Apple or your email and password". */
function orList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`;
}

export const authErrorMessages: Record<AuthErrorCode, string> = {
  // There is no "email already taken": sign-up answers the same either way, so
  // that no screen can tell anyone which addresses are registered (spec §2.2).
  // The API answers a wrong code and an expired one identically, so this covers both.
  invalidCode: "That code didn't work. Check the email, or send yourself a new code.",
  expiredCode: 'That code has expired. Send yourself a new one.',
  codeUsedUp: "That's too many wrong tries, so this code no longer works. Send yourself a new one.",
  // Deliberately vague about which half is wrong: saying "no account with that
  // email" would let anyone test which addresses are registered.
  invalidCredentials: "Invalid email or password. Please try again.",
  invalidDetails: 'Some details need another look.',
  emailNotVerified: 'Confirm your email first — we have sent you a new code.',
  stepUpRequired: 'We emailed you a code to confirm it is you. Enter it to finish signing in.',
  // Shown through emailRegisteredCopy, which names the ways in; this is the bare fallback.
  emailAlreadyRegistered: 'This email already has an account.',
  providerRejected: "We couldn't sign you in with that account. Please try again.",
  providerUnavailable: "That sign-in option isn't available on this device. Use your email address instead.",
  cancelled: '',
  sessionExpired: 'Your session has ended. Please sign in again.',
  // The API gives no reason, and guessing one could reveal why an account was
  // refused (a ban, say), so this says only that it cannot be done.
  signUpRefused: "We can't create an account with these details. If you think this is a mistake, contact support.",
  passwordBreached:
    'That password has appeared in a known data breach. Please choose a different one.',
  termsOutdated: 'Our terms were updated a moment ago. Please try again.',
  rateLimited: 'Too many attempts. Wait a minute and try again.',
  network: "We couldn't reach Ajala. Check your connection and try again.",
  unknown: 'Something went wrong. Please try again.',
};

/**
 * What to say when the API rejects a particular value.
 *
 * Keyed by the API's own field names. Its messages are written for developers
 * ("lastName must be longer than or equal to 1 characters"), so the ones we can
 * anticipate get our own wording; anything else falls back to the server's text,
 * which is still far better than a blanket "check your details".
 */
export const signUpFieldErrorMessages: Record<string, string> = {
  email: 'Enter a valid email address.',
  password: `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters, with an uppercase letter and a number.`,
  firstName: 'Enter your first and last name.',
  lastName: 'Enter your first and last name.',
  dob: 'Enter a valid date of birth.',
};

/** Field limits from the API (spec §4), said the way a person would fix them. */
export const fieldLimitMessages = {
  nameTooLong: `Keep your first name and your last name to ${fieldLimits.nameMax} characters each.`,
  passwordTooLong: `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`,
} as const;

/** RATE_LIMITED with a known wait: says when the button will work again. */
export function rateLimitedMessage(seconds: number): string {
  return seconds > 0
    ? `Too many attempts. Try again in ${formatCountdown(seconds)}.`
    : authErrorMessages.rateLimited;
}

/**
 * Resending is capped at 3 codes an hour per address, so the generic "wait a
 * minute" would be wrong here.
 */
export const resendLimitedMessage =
  "You've asked for several codes in the last hour. Check your inbox and spam, or try again later.";

export const resendSentMessage = 'We sent you a new code.';

export const providerNames = { apple: 'Apple', google: 'Google' } as const;

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
