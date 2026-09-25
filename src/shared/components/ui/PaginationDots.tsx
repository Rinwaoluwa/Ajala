import { View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { cn } from '@shared/utils/cn';

/**
 * Carousel position indicator.
 *
 * From the Figma `Carousel Active` component: 8pt dots, 6pt gap, and the active dot
 * widens into a marigold pill rather than only changing colour.
 *
 * Driven by `progress` — a Reanimated shared value holding the carousel's scroll
 * position in pages (2.4 means "40% of the way from page 2 to page 3"). The dots
 * therefore move exactly with the image, including mid-swipe and when a swipe is
 * abandoned. A timed animation fired on settle cannot do that: it always starts
 * after the image has finished moving, which is what made this feel slow and
 * detached.
 *
 * Animation runs on the UI thread, so it holds up while JS is busy.
 */

const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;

/** Inactive dot colour when the dots sit on photography rather than app surface. */
const ON_MEDIA_INACTIVE = '#FFFFFF';

export type PaginationDotsProps = {
  count: number;
  /**
   * Animated position in slides. Fractional between slides, so the dots move with
   * the transition rather than snapping when it ends.
   */
  progress: SharedValue<number>;
  /** Settled index, for the accessibility label only. */
  activeIndex: number;
  /** True when the dots sit over an image rather than the page background. */
  onSurface?: boolean;
  className?: string;
};

type DotProps = {
  index: number;
  progress: SharedValue<number>;
  inactiveColor: string;
  activeColor: string;
};

function Dot({ index, progress, inactiveColor, activeColor }: DotProps) {
  const style = useAnimatedStyle(() => {
    // Only the neighbouring pages affect this dot, so width and colour cross over
    // smoothly as the image passes.
    const range = [index - 1, index, index + 1];
    return {
      width: interpolate(progress.value, range, [DOT_SIZE, ACTIVE_WIDTH, DOT_SIZE], 'clamp'),
      backgroundColor: interpolateColor(progress.value, range, [
        inactiveColor,
        activeColor,
        inactiveColor,
      ]),
    };
  });

  return <Animated.View style={[{ height: DOT_SIZE, borderRadius: DOT_SIZE / 2 }, style]} />;
}

export function PaginationDots({
  count,
  progress,
  activeIndex,
  onSurface = false,
  className,
}: PaginationDotsProps) {
  const theme = useTheme();

  // Reanimated interpolates concrete colour values, not class names.
  //
  // Dots over media do NOT follow the colour scheme. A photograph is the same
  // photograph in both themes, so resolving `onSurface` through the theme made the
  // inactive dots #17231F in dark mode — near-black pips on a dark photo, invisible.
  // They stay white; the active dot is marigold, which holds on both.
  const inactiveColor = onSurface ? ON_MEDIA_INACTIVE : theme.muted;
  const activeColor = theme.accent;

  return (
    <View
      className={cn('flex-row items-center gap-6', className)}
      accessibilityRole="progressbar"
      // Read from the plain prop, not progress.value — touching a shared value
      // during render is what triggers Reanimated's read-during-render warning.
      accessibilityLabel={`Slide ${activeIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <Dot
          key={i}
          index={i}
          progress={progress}
          inactiveColor={inactiveColor}
          activeColor={activeColor}
        />
      ))}
    </View>
  );
}
