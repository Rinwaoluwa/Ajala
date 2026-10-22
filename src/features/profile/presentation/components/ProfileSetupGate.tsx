import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, LoadingRing, Screen, Text } from '@shared/components';

import { profileErrorMessages } from '../copy';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * Holds the setup screens until `GET /me` has answered: each step prefills from
 * it. While it loads, the ring; if it fails, the reason and a retry.
 *
 * `waitForProfile` is off for the first route (location), which needs nothing
 * from the profile and should not wait on the network.
 */
export function ProfileSetupGate({
  children,
  waitForProfile = true,
}: {
  children: ReactNode;
  waitForProfile?: boolean;
}) {
  const { profile, loadError, reload } = useProfileSetup();
  if (!waitForProfile || profile) return <>{children}</>;

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center">
        {loadError ? (
          <Animated.View entering={FadeIn.duration(220)} className="items-center self-stretch">
            <Text variant="bodySm" tone="muted" className="text-center" accessibilityLiveRegion="polite">
              {profileErrorMessages[loadError]}
            </Text>
            <View className="mt-20 self-stretch">
              <Button label="Try again" size="lg" fullWidth onPress={reload} />
            </View>
          </Animated.View>
        ) : (
          <LoadingRing accessibilityLabel="Loading your profile" />
        )}
      </View>
    </Screen>
  );
}
