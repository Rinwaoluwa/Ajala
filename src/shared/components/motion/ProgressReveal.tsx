import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Shows or hides its content in step with a live progress value, such as a
 * pager's scroll offset.
 *
 * Unlike a mount animation, this is scrubbed rather than played: the content is
 * exactly as visible as `progress` says, frame by frame. Drag towards the range
 * and it fades and rises in under your finger; drag away and it sinks back out
 * the same way. A programmatic scroll (a Next tap) drives it identically, because
 * both move the same value.
 *
 * `range` is where the change happens, in progress units. With `mode="in"` the
 * content is hidden before `range[0]` and fully shown from `range[1]`; `mode="out"`
 * is the reverse. Stagger a group by giving each item a slightly later range.
 *
 * `interactive` decides whether the content takes touches and is exposed to
 * assistive technology. Drive it from settled state (the index the pager rested
 * on), not from progress: a half-visible button mid-swipe should not be tappable,
 * and a screen reader should not hear controls that are fading out.
 *
 * With Reduce Motion on, the content only fades, with no vertical movement.
 */

/** How far below its resting place hidden content sits. */
const RISE_PX = 16;

export type ProgressRevealProps = {
  children: ReactNode;
  progress: SharedValue<number>;
  /** Progress values between which the content changes, [start, end]. */
  range: readonly [number, number];
  /** 'in' reveals across the range, 'out' hides across it. */
  mode?: 'in' | 'out';
  /** Whether the content takes touches and is visible to assistive technology. */
  interactive: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ProgressReveal({
  children,
  progress,
  range,
  mode = 'in',
  interactive,
  style,
}: ProgressRevealProps) {
  const reduceMotion = useReducedMotion();
  const [start, end] = range;

  const animatedStyle = useAnimatedStyle(() => {
    const raw = (progress.get() - start) / (end - start);
    const t = Math.min(Math.max(raw, 0), 1);
    // Eased so the content settles into place rather than stopping dead.
    const shown = Easing.out(Easing.cubic)(mode === 'in' ? t : 1 - t);
    return {
      opacity: shown,
      transform: [{ translateY: reduceMotion ? 0 : (1 - shown) * RISE_PX }],
    };
  });

  return (
    <Animated.View
      style={[style, animatedStyle]}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </Animated.View>
  );
}
