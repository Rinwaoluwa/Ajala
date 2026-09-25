import { View } from 'react-native';

import { Screen, Text } from '@shared/components';

/**
 * PLACEHOLDER — the sign-in flow (MOB-005) has not been built.
 *
 * It exists so onboarding has a real destination: expo-router types routes from the
 * files present, and navigating to a route that does not exist fails at runtime as
 * well as in the type checker. Replace this with the auth feature's screen.
 */
export default function SignInRoute() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center">
        <Text variant="headingLg" tone="primary">
          Sign in
        </Text>
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          Not built yet. Onboarding lands here once it is complete.
        </Text>
      </View>
    </Screen>
  );
}
