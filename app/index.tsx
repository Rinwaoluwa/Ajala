import { Redirect } from 'expo-router';

import { appRoutes, useAuthState } from '@features/auth';
import { onboardingRoutes, useOnboardingGate } from '@features/onboarding';

/**
 * Entry point. Decides where a cold start goes.
 *
 * It waits for BOTH persisted answers — has the tour been seen, and is there a
 * stored session — before routing. Redirecting on a half-hydrated app is what
 * sends a signed-in person to the sign-in screen, or replays the tour, on every
 * cold start.
 *
 *   - first launch            → the tour, which ends on the welcome page
 *   - seen the tour, signed out → the welcome screen (Figma "Splash / Continue")
 *   - signed in               → home
 *
 * Until then it draws nothing: the launch splash is an overlay in the root
 * layout and only fades once this has redirected.
 */
export default function Index() {
  const gate = useOnboardingGate();
  const auth = useAuthState();

  if (gate.status === 'loading' || auth.status === 'loading') return null;
  if (!gate.hasCompleted) return <Redirect href={onboardingRoutes.tour} />;

  return <Redirect href={auth.status === 'signedIn' ? appRoutes.home : onboardingRoutes.welcome} />;
}
