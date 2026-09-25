import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

/**
 * Fades and lifts its content into place when it mounts.
 *
 * Pass `index` to stagger a group: each item starts a beat after the one before,
 * so a stack of controls arrives in reading order rather than all at once.
 *
 * Runs on the UI thread, and respects the system Reduce Motion setting — with it
 * on, content simply appears.
 *
 * Plays on MOUNT only. If the thing you are revealing replaces something else at
 * the same position in the tree, key the parent so React mounts it fresh;
 * otherwise React reuses the old instance and nothing animates.
 */

/** Long enough to read as intentional, short enough not to delay a tap. */
const DURATION_MS = 320;
/** Gap between consecutive items in a staggered group. */
const STAGGER_MS = 80;
/** How far below its resting place the content starts. */
const RISE_PX = 16;

export type RevealProps = {
  children: ReactNode;
  /** Position in a staggered group. 0 starts immediately. */
  index?: number;
  style?: StyleProp<ViewStyle>;
};

export function Reveal({ children, index = 0, style }: RevealProps) {
  const entering = FadeInDown.duration(DURATION_MS)
    .delay(index * STAGGER_MS)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: RISE_PX }] })
    .reduceMotion(ReduceMotion.System);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
