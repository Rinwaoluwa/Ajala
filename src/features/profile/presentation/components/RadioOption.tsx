import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Text } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { palette } from '@shared/theme';

/**
 * A suggestion under the display-name field (Figma "Choose your display name",
 * the radio rows): a 20pt ring, filled green with a white dot when chosen.
 * The dot grows in over 160ms. The whole row is the target, at least 44pt tall.
 */

const RING = 20;

export function RadioOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const on = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    on.value = withTiming(selected ? 1 : 0, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
  }, [selected, on]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: on.value }],
    opacity: on.value,
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: on.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View
        style={{
          width: RING,
          height: RING,
          borderRadius: RING / 2,
          borderWidth: 1,
          borderColor: selected ? palette.success : theme.controlBorder,
          backgroundColor: palette.white,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: RING,
              height: RING,
              backgroundColor: palette.success,
            },
            fillStyle,
          ]}
        />
        <Animated.View
          style={[
            {
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: palette.white,
            },
            dotStyle,
          ]}
        />
      </View>
      <Text variant="bodySm">@{label}</Text>
    </Pressable>
  );
}
