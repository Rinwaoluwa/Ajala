import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button, Screen, Text, TextLink } from '@shared/components';

import { forceUpdateCopy as copy } from '../copy';

/**
 * "Time to update" — covers the whole app when this build is older than the
 * API's `minAppVersion` (spec §2.1, screen-to-API map §1 and §11).
 *
 * NOT IN FIGMA. Built from the shared parts in the layout of the auth screens
 * (heading block at the top, one large button pinned to the bottom) so it reads
 * as part of the same app, and to be replaced when design draws it.
 *
 * Larger text: `Screen scroll` lets the content scroll once it outgrows the
 * screen, and the flexible spacer keeps the button at the bottom when it fits.
 * The button grows with its label (see `Button`), so nothing clips at 2×.
 *
 * Motion: the screen fades in over 280 ms and its content rises 12pt into place,
 * eased out, on the UI thread. With Reduce Motion on it only fades. It arrives
 * once and stays; there is nothing to dismiss.
 */

const DURATION_MS = 280;
const RISE_PX = 12;
const TOP_OFFSET = 40;

export type ForceUpdateScreenProps = {
  installedVersion: string;
  minimumVersion: string;
  /** Null when the store page is not known; the screen then says where to go. */
  onUpdate: (() => void) | null;
  storeError: string | null;
  /** Development builds only. */
  onBypass: (() => void) | null;
};

export function ForceUpdateScreen({
  installedVersion,
  minimumVersion,
  onUpdate,
  storeError,
  onBypass,
}: ForceUpdateScreenProps) {
  const reduceMotion = useReducedMotion();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.set(withTiming(1, { duration: DURATION_MS, easing: Easing.out(Easing.cubic) }));
  }, [shown]);

  const fade = useAnimatedStyle(() => ({ opacity: shown.get() }));
  const rise = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : (1 - shown.get()) * RISE_PX }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, fade]}
      // Keeps VoiceOver inside this screen; the app underneath is unusable.
      accessibilityViewIsModal
    >
      <Screen scroll>
        <Animated.View style={[{ flexGrow: 1 }, rise]}>
          <View style={{ paddingTop: TOP_OFFSET }}>
            <Text variant="headingXxl" tone="heading" accessibilityRole="header">
              {copy.title}
            </Text>
            <Text variant="bodyMd" className="mt-8">
              {copy.body}
            </Text>
            <Text variant="bodySm" tone="muted" className="mt-12">
              {copy.versions(installedVersion, minimumVersion)}
            </Text>
          </View>

          <View className="flex-1" />

          <View className="mb-24 mt-24">
            {onUpdate ? (
              <Button label={copy.update} size="lg" fullWidth onPress={onUpdate} testID="force-update-open-store" />
            ) : (
              <Text variant="bodyMd" tone="muted">
                {copy.noStoreLink}
              </Text>
            )}
            {storeError ? (
              <Text variant="bodySm" tone="destructive" className="mt-12" accessibilityLiveRegion="polite">
                {storeError}
              </Text>
            ) : null}
            {onBypass ? (
              <View className="mt-16 items-center">
                <TextLink
                  label={copy.devBypass}
                  tone="foreground"
                  emphasis="plain"
                  onPress={onBypass}
                  testID="force-update-dev-bypass"
                />
              </View>
            ) : null}
          </View>
        </Animated.View>
      </Screen>
    </Animated.View>
  );
}
