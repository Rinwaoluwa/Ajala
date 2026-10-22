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
 * `tone` picks the highlight: sign-up marks the step in the primary teal, password
 * reset in Marigold. Both designs are in the file, so this is a prop rather than a
 * single token.
 *
 * Built in React Native: Expo UI's universal set has no segmented progress view.
 */

const stepper = layout.stepper;

export type StepProgressTone = 'primary' | 'accent';

export type StepProgressProps = {
  count: number;
  /** Zero-based index of the current step. */
  current: number;
  tone?: StepProgressTone;
};

export function StepProgress({ count, current, tone = 'primary' }: StepProgressProps) {
  const theme = useTheme();
  const activeColor: Record<StepProgressTone, string> = {
    primary: theme.primary,
    accent: theme.accent,
  };

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
            backgroundColor: i === current ? activeColor[tone] : theme.track,
          }}
        />
      ))}
    </View>
  );
}
