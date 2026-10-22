/**
 * Public API of the `onboarding` feature.
 */

export { OnboardingScreen, type OnboardingScreenProps } from './presentation/screens/OnboardingScreen';
export { WelcomeScreen, type WelcomeScreenProps } from './presentation/screens/WelcomeScreen';
export { useOnboardingGate, type OnboardingGate } from './presentation/hooks/useOnboardingGate';
export { onboardingExitRoutes, onboardingRoutes } from './presentation/navigation/routes';
export type { OnboardingExit } from './presentation/state/OnboardingState';
