import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

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
 *
 * At rest it is plain text. The animated pieces are mounted only for the 170ms
 * of a roll: there are two of these on every feed post, and carrying their
 * animation hooks all the time made each re-draw of the feed slower.
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

  if (value !== shown) {
    setLeaving(reduceMotion ? null : shown);
    setUp(value > shown);
    setShown(value);
  }
  const settle = useCallback(() => setLeaving(null), []);

  const style = color ? { color } : undefined;
  const number = (n: number) => (
    <Text variant={variant} numberOfLines={1} style={style}>
      {hideZero && n === 0 ? '' : short(n)}
    </Text>
  );

  return (
    <View style={{ height: line, overflow: 'hidden', justifyContent: 'center' }}>
      {leaving === null ? (
        // At rest it is plain text: the animation, and its hooks, exist only while it rolls.
        number(shown)
      ) : (
        <Roll
          // A new roll for each change, so one arriving mid-roll starts cleanly.
          key={`${leaving}>${shown}`}
          line={line}
          direction={up ? 1 : -1}
          arriving={number(shown)}
          going={number(leaving)}
          onDone={settle}
        />
      )}
    </View>
  );
}

/** One number sliding out as the next slides in behind it, then `onDone`. */
function Roll({
  line,
  direction,
  arriving,
  going,
  onDone,
}: {
  line: number;
  direction: 1 | -1;
  arriving: ReactNode;
  going: ReactNode;
  onDone: () => void;
}) {
  const roll = useSharedValue(0);
  useEffect(() => {
    roll.set(
      withTiming(1, { duration: ROLL_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [roll, onDone]);
  const inStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - roll.value) * line * direction }] }));
  const outStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -roll.value * line * direction }] }));
  return (
    <>
      <Animated.View style={inStyle}>{arriving}</Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'center' }, outStyle]}>
        {going}
      </Animated.View>
    </>
  );
}
