import type { OnboardingExit } from '../state/OnboardingState';

/**
 * Where onboarding can send the user. One entry per exit intent; the feature emits
 * the intent and the route file decides the href, so no screen here knows the shape
 * of the auth stack.
 */
export const onboardingExitRoutes: Record<OnboardingExit, '/(auth)/sign-in' | '/(auth)/sign-up'> = {
  signUp: '/(auth)/sign-up',
  signIn: '/(auth)/sign-in',
};

export const onboardingRoutes = {
  tour: '/(onboarding)',
  /** The welcome screen on its own, for a returning visitor who is signed out. */
  welcome: '/(onboarding)/welcome',
} as const;
