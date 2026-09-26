import { View } from 'react-native';

import { SignUpStepHeader } from '@features/auth';
import { Screen, Text } from '@shared/components';

/**
 * PLACEHOLDER — step 3 of sign-up (preferences) has not been designed into the
 * app yet. It exists so "Continue" on the verified sheet has a real destination.
 */
export default function SignUpPreferencesRoute() {
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
      </View>
    </Screen>
  );
}
