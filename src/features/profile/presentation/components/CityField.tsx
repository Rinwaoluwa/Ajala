import { Host } from '@expo/ui';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { NativeIcon, NativeSpinner, Text, icons } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { layout, palette } from '@shared/theme';

import { setupCopy } from '../copy';

/**
 * "Current city": the pale filled box with a location mark, the city, and
 * "Auto-detected" at the right when it came from the phone. Tapping it opens the
 * city search, which is also the way in when location could not find one.
 *
 * Pale in both schemes with ink text, as the dark frame draws it. The box grows
 * with the text size; the city fades in when detection lands.
 */

const input = layout.input;

export type CityFieldProps = {
  label: string | null;
  detected: boolean;
  detecting: boolean;
  onPress: () => void;
};

export function CityField({ label, detected, detecting, onPress }: CityFieldProps) {
  const theme = useTheme();
  const text = label ?? (detecting ? setupCopy.basics.cityDetecting : setupCopy.basics.cityPlaceholder);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${setupCopy.basics.currentCity}: ${text}`}
      accessibilityHint="Search for a different city"
    >
      {({ pressed }) => (
        <View
          style={{
            minHeight: input.heightWithIcon,
            borderWidth: 1,
            borderColor: theme.controlBorder,
            borderRadius: input.radius,
            backgroundColor: theme.chipFill,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 15,
            paddingVertical: 10,
            opacity: pressed ? 0.7 : 1,
          }}
        >
          <Host matchContents pointerEvents="none">
            <NativeIcon source={icons.location} size={18} color={palette.ink} />
          </Host>
          <Animated.View key={label ?? 'empty'} entering={FadeIn.duration(200)} style={{ flex: 1 }}>
            <Text variant="bodySm" style={{ color: label ? palette.ink : palette.inkSecondary }}>
              {text}
            </Text>
          </Animated.View>
          {detecting && !label ? (
            <Host matchContents>
              <NativeSpinner size={14} color={palette.inkSecondary} />
            </Host>
          ) : detected && label ? (
            <Text variant="bodyXs" style={{ color: palette.inkSecondary }}>
              {setupCopy.basics.autoDetected}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}
