import { router } from 'expo-router';
import { useCallback } from 'react';

import { OnboardingScreen, onboardingExitRoutes, type OnboardingExit } from '@features/onboarding';

/**
 * Route file: renders the feature screen and owns the destination for each exit.
 */
export default function OnboardingRoute() {
  const handleExit = useCallback((intent: OnboardingExit) => {
    router.replace(onboardingExitRoutes[intent]);
  }, []);

  return <OnboardingScreen onExit={handleExit} />;
}
