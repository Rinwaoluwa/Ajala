import { Image } from 'expo-image';
import { useEffect } from 'react';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * The full-screen loader's ring (Figma "Loading", after profile setup): a thick
 * circle that deepens from a pale tail to a teal head, turning.
 *
 * The art is `assets/images/loader/ring.svg` — SVG has no sweeping gradient, so
 * it is drawn as 72 short arcs, each a step along the ramp. It reads on both
 * Night and white, which is how both frames draw it.
 *
 * One turn a second, linear, on the UI thread. With Reduce Motion it turns at a
 * third of the speed: a still ring would read as a frozen app, and a slow turn
 * is not the kind of motion that setting is for.
 */

const ring = require('../../../../assets/images/loader/ring.svg') as number;

const TURN_MS = 1000;

export type LoadingRingProps = {
  /** Diameter in points. The design draws it at 68. */
  size?: number;
  accessibilityLabel?: string;
};

export function LoadingRing({ size = 68, accessibilityLabel = 'Loading' }: LoadingRingProps) {
  const reduceMotion = useReducedMotion();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = 0;
    turn.value = withRepeat(
      withTiming(1, {
        duration: reduceMotion ? TURN_MS * 3 : TURN_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    return () => cancelAnimation(turn);
  }, [turn, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 360}deg` }],
  }));

  return (
    <Animated.View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      style={[{ width: size, height: size }, style]}
    >
      <Image source={ring} style={{ width: size, height: size }} contentFit="contain" />
    </Animated.View>
  );
}
