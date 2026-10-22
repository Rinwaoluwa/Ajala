import { Image } from 'expo-image';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Screen, Text, enterRise } from '@shared/components';
import { SCREEN_GUTTER } from '@shared/theme';

import type { LocationAccess } from '../../domain/LocationAccess';
import { locationAccessCopy as copy } from '../copy';

/**
 * "Turn on location to explore AJALA" (Figma, light and dark).
 *
 * One illustration serves both schemes: the map's lines are a mid grey at 60%,
 * and the white disc behind the crossed-out pin vanishes on white and shows on
 * Night, which is exactly the difference between the two frames.
 *
 * Two states share the layout:
 *   - `askable`: the system prompt can still be shown — "Turn on location" asks;
 *   - `blocked`: only Settings can help — the Settings hint appears and the
 *     button opens this app's page there. Coming back from Settings re-reads the
 *     permission (`useLocationAccess`), so the screen moves on by itself.
 *
 * The art is the design's 353×250 frame, scaled to the content width. The copy
 * scrolls when the text size outgrows the screen; the button stays at the foot.
 * The column enters in a short stagger: art, heading, copy.
 */

const ART = require('../../../../../assets/icons/location-off.svg') as number;
const ART_ASPECT = 250 / 353;

export type LocationAccessScreenProps = {
  status: Exclude<LocationAccess, 'granted'>;
  busy?: boolean;
  onAllow: () => void;
  onOpenSettings: () => void;
};

export function LocationAccessScreen({
  status,
  busy = false,
  onAllow,
  onOpenSettings,
}: LocationAccessScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const artWidth = Math.min(353, width - SCREEN_GUTTER * 2);
  const blocked = status === 'blocked';

  return (
    <Screen edges={['top']} padded={false}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: 48,
          paddingBottom: 24,
        }}
      >
        <Animated.View entering={enterRise(0)} style={{ alignItems: 'center' }}>
          <Image
            source={ART}
            style={{ width: artWidth, height: artWidth * ART_ASPECT }}
            contentFit="contain"
            accessibilityIgnoresInvertColors
            accessible={false}
          />
        </Animated.View>
        <Animated.View entering={enterRise(60)}>
          <Text
            variant="headingXxl"
            tone="accent"
            className="mt-8 text-center dark:text-heading"
            accessibilityRole="header"
          >
            {copy.title}
          </Text>
        </Animated.View>
        {/* The frames set the copy narrower than the heading. */}
        <Animated.View entering={enterRise(120)} style={{ paddingHorizontal: 12 }}>
          <Text variant="bodyMd" className="mt-12 text-center">
            {copy.body}
          </Text>
          {blocked ? (
            <Text variant="bodyMd" className="mt-24 text-center">
              {copy.settingsHint}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
        }}
      >
        <Button
          label={blocked ? copy.openSettings : copy.allow}
          size="lg"
          fullWidth
          loading={busy}
          onPress={blocked ? onOpenSettings : onAllow}
          testID="location-access-action"
        />
      </View>
    </Screen>
  );
}
