import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { nextStepRoutes, signInRoutes, useAuthState, useEntryCheck } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The signed-in app.
 *
 * Guards once, here, rather than in each screen. It waits for the stored session
 * to come out of the keychain before deciding: redirecting while that is still
 * loading would bounce a signed-in person to the sign-in screen on every cold
 * start. The launch overlay is still up during that wait, so nothing flashes.
 *
 * A session restored from the last launch is then checked against `GET /me`
 * (`useEntryCheck`): updated terms, or an unfinished profile, come before the app.
 */
export default function AppLayout() {
  const auth = useAuthState();
  const entry = useEntryCheck();
  const screenOptions = useStackScreenOptions();

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Redirect href={signInRoutes.options} />;
  if (entry.redirectTo) return <Redirect href={nextStepRoutes[entry.redirectTo]} />;
  // Usually a few hundred milliseconds, much of it under the launch overlay.
  if (entry.pending) return <View className="flex-1 bg-background" />;

  return <Stack screenOptions={screenOptions} />;
}
