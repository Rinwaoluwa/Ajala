import { router } from 'expo-router';
import { useCallback } from 'react';

import { WelcomeScreen, onboardingExitRoutes, type OnboardingExit } from '@features/onboarding';

/**
 * Route file: the welcome screen for a returning, signed-out visitor. It owns the
 * destination for each way in, as the tour's route does.
 */
export default function WelcomeRoute() {
  const handleExit = useCallback((intent: OnboardingExit) => {
    router.replace(onboardingExitRoutes[intent]);
  }, []);

  return <WelcomeScreen onExit={handleExit} />;
}
