import { Redirect } from 'expo-router';

import { useOnboardingGate } from '@features/onboarding';

/**
 * Entry point. Decides where to start; it is not a screen.
 *
 * Renders nothing until the persisted onboarding flag has hydrated — the splash is
 * still up at that point, and redirecting early is what sends cold starts to the
 * wrong place.
 */
export default function Index() {
  const gate = useOnboardingGate();

  if (gate.status === 'loading') return null;

  return <Redirect href={gate.hasCompleted ? '/(auth)/sign-in' : '/(onboarding)'} />;
}
