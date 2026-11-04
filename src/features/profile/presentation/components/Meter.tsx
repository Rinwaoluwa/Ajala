import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * A thin rounded progress bar (badge progress, "Lagos progress"): Marigold by
 * default, on the theme's track. It fills to its value over 350ms when shown or
 * changed; Reduce Motion sets it at once.
 */
export function Meter({
  value,
  color,
  height = 6,
  label,
}: {
  /** 0–1. */
  value: number;
  color?: string;
  height?: number;
  label: string;
}) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const fill = useSharedValue(0);
  const clamped = Math.min(1, Math.max(0, value));

  useEffect(() => {
    fill.set(withTiming(clamped, { duration: reduceMotion ? 0 : 350, easing: Easing.out(Easing.cubic) }));
  }, [clamped, reduceMotion, fill]);

  const style = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{ height, borderRadius: height / 2, backgroundColor: theme.track, overflow: 'hidden' }}
    >
      <Animated.View
        style={[{ height, borderRadius: height / 2, backgroundColor: color ?? theme.accent }, style]}
      />
    </View>
  );
}
