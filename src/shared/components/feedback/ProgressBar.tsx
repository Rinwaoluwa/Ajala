import { View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

/**
 * A horizontal, pill-shaped progress bar.
 *
 * Purely a display: it draws whatever `progress` (0 to 1) holds and owns no timing
 * of its own, so the caller decides what progress means. Driven by a Reanimated
 * shared value, so the fill animates on the UI thread.
 *
 * Built in React Native rather than Expo UI because Expo UI's universal component
 * set has no progress view.
 */

export type ProgressBarProps = {
  progress: SharedValue<number>;
  width: number;
  height?: number;
  /** Announced to assistive technology, e.g. "Loading". */
  accessibilityLabel?: string;
  /**
   * Explicit colours for a surface that does not follow the colour scheme. Leave
   * them out and the bar uses the themed border track and primary fill.
   */
  trackColor?: string;
  fillColor?: string;
};

export function ProgressBar({
  progress,
  width,
  height = 8,
  accessibilityLabel = 'Loading',
  trackColor,
  fillColor,
}: ProgressBarProps) {
  const theme = useTheme();

  const fillStyle = useAnimatedStyle(() => ({
    width: Math.min(Math.max(progress.get(), 0), 1) * width,
  }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ busy: true }}
      style={{
        width,
        height,
        borderRadius: height / 2,
        backgroundColor: trackColor ?? theme.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          { height, borderRadius: height / 2, backgroundColor: fillColor ?? theme.primary },
          fillStyle,
        ]}
      />
    </View>
  );
}
