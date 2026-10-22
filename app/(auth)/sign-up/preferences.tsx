import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { SignUpStepHeader, signInRoutes, useSignOut } from '@features/auth';
import { Button, Screen, Text } from '@shared/components';

/**
 * PLACEHOLDER — step 3 of sign-up (preferences / profile setup) has not been
 * designed into the app yet. It exists so "Continue" on the verified sheet has a
 * real destination.
 *
 * It is also where `GET /me` sends anyone whose `profileCompletedAt` is null —
 * which, until profile setup can set a gender, is every account (spec §2.4). So
 * it offers a way out, or a tester would be stuck here on every launch.
 */
export default function SignUpPreferencesRoute() {
  const signOut = useSignOut();
  // Signing out tells the API first, which can take a moment on a slow network.
  const [signingOut, setSigningOut] = useState(false);

  return (
    <Screen edges={['top', 'bottom']} padded={false}>
      <SignUpStepHeader step={2} />
      <View className="flex-1 items-center justify-center px-20">
        <Text variant="headingLg" tone="heading">
          Preferences
        </Text>
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          Not built yet. Sign-up lands here after your email is verified.
        </Text>
        <View className="mt-24">
          <Button
            label="Sign out"
            variant="secondary"
            loading={signingOut}
            onPress={() => {
              setSigningOut(true);
              void signOut().then(() => router.replace(signInRoutes.options));
            }}
          />
        </View>
      </View>
    </Screen>
  );
}
