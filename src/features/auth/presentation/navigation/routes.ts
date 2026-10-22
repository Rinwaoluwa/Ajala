import type { NextStep } from '../../domain/rules/accountRules';

/**
 * Where the auth flows live in the app's route tree. Route files read these, so a
 * moved screen is one edit here rather than a search through `app/`.
 */
export const signUpRoutes = {
  options: '/(auth)/sign-up',
  details: '/(auth)/sign-up/details',
  verify: '/(auth)/sign-up/verify',
  preferences: '/(auth)/sign-up/preferences',
  signIn: '/(auth)/sign-in',
} as const;

export const signInRoutes = {
  options: '/(auth)/sign-in',
  email: '/(auth)/sign-in/email',
  /** The Verification screen for a step-up code. */
  stepUp: '/(auth)/sign-in/verify',
  signUp: '/(auth)/sign-up',
  forgotPassword: '/(auth)/forgot-password',
  /** Where an unverified account is sent to finish confirming its address. */
  verifyEmail: '/(auth)/sign-up/verify',
} as const;

/** Shared by sign-up and sign-in: Google and Apple land in the same places. */
export const accountRoutes = {
  /** The Verification screen for linking Google or Apple; takes `challengeId` and `provider`. */
  linkAccount: '/(auth)/link-account',
  terms: '/(auth)/terms',
} as const;

export const passwordResetRoutes = {
  email: '/(auth)/forgot-password',
  /** The emailed link lands here carrying `?token=…`. */
  newPassword: '/(auth)/forgot-password/new-password',
  signIn: '/(auth)/sign-in',
} as const;

/** Where a signed-in person belongs. */
export const appRoutes = {
  home: '/(app)',
} as const;

/** Where each answer from `GET /me` sends someone who has just signed in. */
export const nextStepRoutes = {
  // Profile setup is step 3 of sign-up. It is a placeholder until it is built.
  completeProfile: signUpRoutes.preferences,
  acceptTerms: accountRoutes.terms,
  home: appRoutes.home,
} as const satisfies Record<NextStep, string>;
