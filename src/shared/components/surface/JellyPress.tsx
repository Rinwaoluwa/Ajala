import type { ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { haptics } from '@shared/feedback/haptics';

/**
 * A press with a jelly wobble: the moment it is touched the button squashes
 * (wider, shorter), then springs back through a few quick, fading wobbles, the
 * way Liquid Glass buttons feel on iOS 26. The same on iOS and Android.
 *
 * A light tap of haptics goes with it. Scale only, so nothing around it moves.
 * With Reduce Motion it stays still (the tap remains).
 * Everything inside wobbles together (the glass, its icon, an unread badge).
 */
export type JellyPressProps = Omit<PressableProps, 'children'> & {
  children: ReactNode;
};

const SQUASH_MS = 80;
// Low damping: the spring overshoots and settles in a few visible wobbles.
const WOBBLE = { damping: 5, stiffness: 300, mass: 0.5 } as const;

export function JellyPress({ children, onPressIn, ...props }: JellyPressProps) {
  const reduceMotion = useReducedMotion();
  const sx = useSharedValue(1);
  const sy = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: sx.value }, { scaleY: sy.value }] }));

  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        haptics.tap();
        if (!reduceMotion) {
          sx.set(withSequence(withTiming(1.14, { duration: SQUASH_MS }), withSpring(1, WOBBLE)));
          sy.set(withSequence(withTiming(0.88, { duration: SQUASH_MS }), withSpring(1, WOBBLE)));
        }
        onPressIn?.(e);
      }}
    >
      <Animated.View style={style}>{children}</Animated.View>
    </Pressable>
  );
}
