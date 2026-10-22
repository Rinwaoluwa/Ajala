import { useState } from 'react';
import { View } from 'react-native';

import { useSignOut } from '@features/auth';
import { Button, Screen, Text } from '@shared/components';

/**
 * PLACEHOLDER — the signed-in app has not been built. It exists so sign-in has a
 * real destination, and so the session can be ended without reinstalling.
 */
export default function HomeRoute() {
  const signOut = useSignOut();
  // Signing out tells the API first, which can take a moment on a slow network.
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="headingLg" tone="heading">
          You&rsquo;re signed in
        </Text>
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          Not built yet. The app&rsquo;s home screen lands here.
        </Text>
        <View className="mt-24">
          <Button
            label="Sign out"
            variant="secondary"
            loading={signingOut}
            onPress={() => {
              setSigningOut(true);
              void signOut();
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
