import { Redirect } from 'expo-router';

import { useOnboardingGate } from '@features/onboarding';

/**
 * Entry point. Decides where a cold start goes.
 *
 * It never routes before the persisted onboarding flag has hydrated — redirecting
 * early is what sends cold starts to the wrong place. Until then it draws nothing;
 * the launch splash (an overlay in the root layout) covers it, and only fades once
 * this has redirected.
 */
export default function Index() {
  const gate = useOnboardingGate();

  if (gate.status === 'loading') return null;

  return <Redirect href={gate.hasCompleted ? '/(auth)/sign-in' : '/(onboarding)'} />;
}
