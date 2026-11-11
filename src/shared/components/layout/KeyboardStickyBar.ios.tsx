import type { ReactNode } from 'react';
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * A bar pinned to the foot of a screen (the comment bar, a chat's composer)
 * that rides up on the keyboard, on iOS.
 *
 * It moves only itself. The old way — a `KeyboardAvoidingView` round the whole
 * screen — shrank the scroll view under it, and iOS then shifted everything on
 * screen to keep the content in bounds: the post's buttons jumped about every
 * time the comment field was tapped. Here the scroll view keeps its size (give
 * it `automaticallyAdjustKeyboardInsets` so its end can still be reached) and
 * the bar slides up by exactly the keyboard's height, frame for frame with the
 * keyboard's own animation (`useAnimatedKeyboard` runs on the UI thread).
 *
 * The bar keeps its home-indicator padding; while the keyboard is up that
 * padding would be wasted space over it, so the bar rides `gap` points short of
 * the keyboard's height to sit at `gap` above it instead.
 */
export function KeyboardStickyBar({ children, gap = 12 }: { children: ReactNode; gap?: number }) {
  const keyboard = useAnimatedKeyboard();
  const insets = useSafeAreaInsets();
  // What the bar pads below its field while the keyboard is down.
  const slack = Math.max(insets.bottom, gap) - gap;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(0, keyboard.height.value - slack) }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
