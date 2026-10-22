import { router } from 'expo-router';
import { useCallback } from 'react';

import { StepUpVerificationScreen, nextStepRoutes, type NextStep } from '@features/auth';

/** The step-up code, answered by signing in again with it attached. */
export default function StepUpRoute() {
  // Stable, because the screen goes back from an effect when there is no challenge.
  const back = useCallback(() => router.back(), []);
  return (
    <StepUpVerificationScreen
      onBack={back}
      onSignedIn={(next: NextStep) => router.replace(nextStepRoutes[next])}
    />
  );
}
