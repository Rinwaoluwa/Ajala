import type { OnboardingExit } from '../state/OnboardingState';

/**
 * Where onboarding can send the user. One entry per exit intent; the feature emits
 * the intent and the route file decides the href, so no screen here knows the shape
 * of the auth stack.
 */
export const onboardingExitRoutes: Record<OnboardingExit, '/(auth)/sign-in' | '/(auth)/sign-up'> = {
  skip: '/(auth)/sign-in',
  signUp: '/(auth)/sign-up',
  signIn: '/(auth)/sign-in',
};
