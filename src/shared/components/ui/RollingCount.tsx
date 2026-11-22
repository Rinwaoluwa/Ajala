import { useEffect, useState } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useFontScale } from '@shared/hooks/useFontScale';
import { textStyles } from '@shared/theme';

import { Text, type TextVariant } from './Text';

/**
 * A count that rolls when it changes while on screen (a post's comments): the
 * old number slides out and the new one slides in behind it, clipped to the
 * line, in 170ms. Up for a rise, down for a fall. From the reference recording
 * (docs/design/feed-post-motion.md §5).
 *
 * It only moves on a change: a count that is simply there does nothing. With
 * Reduce Motion the number swaps in place. Large counts are shortened ("1.2K").
 * With `hideZero` a 0 is drawn as nothing, so the first one rolls in.
 */
const ROLL_MS = 170;

const short = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
      : String(n);

export function RollingCount({
  value,
  variant = 'bodySm',
  color,
  hideZero = false,
}: {
  value: number;
  variant?: TextVariant;
  color?: ColorValue;
  /**
   * Draw nothing for 0, yet stay in place: the first like or comment then rolls
   * in from nothing, and the last one rolls out, instead of popping.
   */
  hideZero?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const line = Math.round(textStyles[variant].lineHeight * useFontScale());
  // The number in place, and the one on its way out (null when nothing is moving).
  const [shown, setShown] = useState(value);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [up, setUp] = useState(true);
  const roll = useSharedValue(1);

  if (value !== shown) {
    setLeaving(reduceMotion ? null : shown);
    setUp(value > shown);
    setShown(value);
  }

  useEffect(() => {
    if (leaving === null) return;
    roll.set(0);
    roll.set(
      withTiming(1, { duration: ROLL_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setLeaving)(null);
      }),
    );
  }, [leaving, shown, roll]);

  const direction = up ? 1 : -1;
  const arriving = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - roll.value) * line * direction }],
  }));
  const going = useAnimatedStyle(() => ({ transform: [{ translateY: -roll.value * line * direction }] }));
  const style = color ? { color } : undefined;
  const text = (n: number) => (hideZero && n === 0 ? '' : short(n));

  return (
    <View style={{ height: line, overflow: 'hidden', justifyContent: 'center' }}>
      <Animated.View style={leaving === null ? undefined : arriving}>
        <Text variant={variant} numberOfLines={1} style={style}>
          {text(shown)}
        </Text>
      </Animated.View>
      {leaving !== null ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'center' }, going]}>
          <Text variant={variant} numberOfLines={1} style={style}>
            {text(leaving)}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}
