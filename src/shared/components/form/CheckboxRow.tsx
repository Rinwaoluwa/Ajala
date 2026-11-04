import { Host } from '@expo/ui';
import { memo, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

import { NativeIcon } from '../ui/NativeIcon';
import { Text } from '../ui/Text';
import { icons } from '../ui/icons';

/**
 * A ticked-or-not line in a list of reasons ("Report activity"): a 20pt rounded
 * box, then the label. The whole row is the target, at least 44pt tall, and it
 * grows with the text-size setting.
 *
 * Ticked, the box fills teal with a white check. The fill cross-fades in 150ms
 * and the check fades with it.
 */

const BOX = 20;
const FADE_MS = 150;

export type CheckboxRowProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
  testID?: string;
};

function CheckboxRowComponent({ label, checked, onToggle, testID }: CheckboxRowProps) {
  const theme = useTheme();
  const on = useSharedValue(checked ? 1 : 0);

  useEffect(() => {
    on.set(withTiming(checked ? 1 : 0, { duration: FADE_MS, easing: Easing.out(Easing.quad) }));
  }, [checked, on]);

  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(on.value, [0, 1], ['transparent', theme.primaryFill]),
    borderColor: interpolateColor(on.value, [0, 1], [theme.controlBorder, theme.primaryFill]),
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      testID={testID}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }}
    >
      <Animated.View
        style={[
          {
            width: BOX,
            height: BOX,
            borderRadius: 5,
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
          },
          boxStyle,
        ]}
      >
        <Animated.View style={checkStyle} pointerEvents="none">
          <Host matchContents>
            <NativeIcon source={icons.check} size={11} color={theme.primaryFillForeground} />
          </Host>
        </Animated.View>
      </Animated.View>
      <View style={{ flex: 1 }}>
        <Text variant="bodySm">{label}</Text>
      </View>
    </Pressable>
  );
}

export const CheckboxRow = memo(CheckboxRowComponent);
