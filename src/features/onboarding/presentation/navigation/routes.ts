import type { OnboardingExit } from '../state/OnboardingState';

/**
 * Where onboarding can send the user. One entry per exit intent; the feature emits
 * the intent and the route file decides the href, so no screen here knows the shape
 * of the auth stack.
 */
export const onboardingExitRoutes: Record<OnboardingExit, '/(auth)/sign-in'> = {
  // Sign-up is not built yet, so all three land on the auth entry for now.
  skip: '/(auth)/sign-in',
  signUp: '/(auth)/sign-in',
  signIn: '/(auth)/sign-in',
};
