import { useEffect, type ReactNode } from 'react';
import { View, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * Loading placeholders (Figma "Home Feed / Skeleton", light and dark).
 *
 * `SkeletonPulse` breathes everything inside it together — one slow 0.55↔1
 * opacity cycle, 1.1s each way — so a screen of blocks reads as one thing
 * loading, not a flicker. Reduce Motion holds it still at full strength.
 * `SkeletonBlock` is one grey (or, on dark, deep-teal) shape inside it.
 *
 * Screen readers hear one "Loading" for the whole group.
 */

export function SkeletonPulse({ children, label = 'Loading' }: { children: ReactNode; label?: string }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={style}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      importantForAccessibility="yes"
    >
      <View importantForAccessibility="no-hide-descendants">{children}</View>
    </Animated.View>
  );
}

export type SkeletonBlockProps = {
  width?: DimensionValue;
  height: number;
  radius?: number;
  /** `surface`: the paler card body colour, for a block inside a card. */
  tone?: 'block' | 'surface';
};

export function SkeletonBlock({ width = '100%', height, radius = 8, tone = 'block' }: SkeletonBlockProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: tone === 'block' ? theme.skeleton : theme.skeletonSurface,
      }}
    />
  );
}
