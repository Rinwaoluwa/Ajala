/**
 * Public API of the `onboarding` feature.
 */

export { OnboardingScreen, type OnboardingScreenProps } from './presentation/screens/OnboardingScreen';
export { useOnboardingGate, type OnboardingGate } from './presentation/hooks/useOnboardingGate';
export { onboardingExitRoutes } from './presentation/navigation/routes';
export type { OnboardingExit } from './presentation/state/OnboardingState';
