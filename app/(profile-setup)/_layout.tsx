import { Redirect, Stack } from 'expo-router';

import { signInRoutes, useAuthState } from '@features/auth';
import { ProfileSetupProvider } from '@features/profile';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * Profile setup: where `GET /me` sends anyone whose profile is not complete
 * (`profileCompletedAt: null`) — every new account, since sign-up never asks for
 * a gender. Signed-in only. The provider holds the draft across the steps and
 * drops it when setup is left.
 */
export default function ProfileSetupLayout() {
  const auth = useAuthState();
  const screenOptions = useStackScreenOptions();

  if (auth.status === 'loading') return null;
  if (auth.status === 'signedOut') return <Redirect href={signInRoutes.options} />;

  return (
    <ProfileSetupProvider>
      <Stack screenOptions={screenOptions}>
        {/* Setup has no way back to sign-up: the account exists now. */}
        <Stack.Screen name="location" options={{ gestureEnabled: false }} />
        <Stack.Screen name="basics" options={{ gestureEnabled: false }} />
        <Stack.Screen name="city" options={{ presentation: 'modal' }} />
        <Stack.Screen name="saving" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="display-name" options={{ animation: 'fade' }} />
      </Stack>
    </ProfileSetupProvider>
  );
}
