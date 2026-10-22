import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Button, LoadingRing, Screen, Text } from '@shared/components';

import { profileErrorMessages, setupCopy } from '../copy';
import { useSaveSetup } from '../hooks/useSaveSetup';

/**
 * The loader between the setup steps and the display name (Figma "Loading"): the
 * gradient ring, centred, on the plain background, while the profile saves.
 *
 * Not drawn: what happens if saving fails. The ring gives way to the reason and
 * a retry, in the same place, fading in.
 */
export function SavingProfileScreen({ onSaved }: { onSaved: () => void }) {
  const { error, retry } = useSaveSetup({ onSaved });
  const copy = setupCopy.saving;

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="flex-1 items-center justify-center">
        {error ? (
          <Animated.View entering={FadeIn.duration(220)} className="items-center self-stretch">
            <Text variant="headingMd" tone="heading" className="text-center" accessibilityRole="header">
              {copy.failedTitle}
            </Text>
            <Text variant="bodySm" tone="muted" className="mt-8 text-center" accessibilityLiveRegion="polite">
              {profileErrorMessages[error]}
            </Text>
            <View className="mt-24 self-stretch">
              <Button label={copy.retry} size="lg" fullWidth onPress={retry} />
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(220)}>
            <LoadingRing accessibilityLabel={copy.label} />
          </Animated.View>
        )}
      </View>
    </Screen>
  );
}
