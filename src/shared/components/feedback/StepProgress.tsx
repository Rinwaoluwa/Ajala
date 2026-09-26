import { View } from 'react-native';

import { useTheme } from '@shared/hooks/useTheme';
import { layout } from '@shared/theme';

/**
 * Where the user is in a multi-step flow, as a row of equal segments.
 *
 * From the Create Account design: 3pt segments, 8pt apart, filling the content
 * width. Only the current step is highlighted. Completed steps return to the track
 * colour, so the bar says "you are here", not "this much is done".
 *
 * Built in React Native: Expo UI's universal set has no segmented progress view.
 */

const stepper = layout.stepper;

export type StepProgressProps = {
  count: number;
  /** Zero-based index of the current step. */
  current: number;
};

export function StepProgress({ count, current }: StepProgressProps) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${count}`}
      accessibilityValue={{ min: 1, max: count, now: current + 1 }}
      style={{ flexDirection: 'row', gap: stepper.gap }}
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: stepper.height,
            borderRadius: stepper.height / 2,
            backgroundColor: i === current ? theme.primary : theme.track,
          }}
        />
      ))}
    </View>
  );
}
