import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { Button, ProgressReveal, buttonMetrics } from '@shared/components';

/**
 * The action area, which changes on the last slide.
 *
 * Slides 1–3: Skip on the left, Next on the right, space-between (Figma frame
 * 1171287759 — Horizontal, Fill, height 44, justify space-between).
 *
 * Last slide: the tour is over, so it offers the two ways into the app — Sign Up
 * filled and Sign In outlined, both full width and stacked.
 *
 * The change follows the photo. Both sets are always mounted and read the pager's
 * live scroll offset: in the first half of the swipe onto the last slide Skip and
 * Next fade away, in the second half Sign Up and then Sign In rise in. Swiping back
 * plays it in reverse, and a Next tap drives it the same way because it scrolls
 * the same pager.
 *
 * The area is always as tall as the final stack, so the copy above never shifts
 * as the buttons change. Skip and Next sit on its bottom edge, where they have
 * always been. Touch and screen-reader focus follow the settled slide, so a
 * half-faded button cannot be tapped.
 */

const GAP = 12;
const FINAL_HEIGHT = buttonMetrics.height.lg * 2 + GAP;

export type OnboardingActionsProps = {
  /** Live pager position in slides, written by the carousel. */
  progress: SharedValue<number>;
  /** Index of the last slide. */
  lastIndex: number;
  /** Whether the pager has settled on the last slide. */
  isLast: boolean;
  busy: boolean;
  onSkip: () => void;
  onNext: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
};

export function OnboardingActions({
  progress,
  lastIndex,
  isLast,
  busy,
  onSkip,
  onNext,
  onSignUp,
  onSignIn,
}: OnboardingActionsProps) {
  return (
    <View style={{ height: FINAL_HEIGHT }}>
      <ProgressReveal
        progress={progress}
        range={[lastIndex - 1, lastIndex - 0.5]}
        mode="out"
        interactive={!isLast}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
      >
        <View className="flex-row items-center justify-between">
          <Button label="Skip" variant="ghost" size="md" onPress={onSkip} disabled={busy} />
          <Button label="Next" variant="primary" size="md" onPress={onNext} disabled={busy} />
        </View>
      </ProgressReveal>

      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, gap: GAP }}>
        <ProgressReveal
          progress={progress}
          range={[lastIndex - 0.5, lastIndex - 0.1]}
          interactive={isLast}
        >
          <Button label="Sign Up" variant="primary" size="lg" fullWidth onPress={onSignUp} loading={busy} />
        </ProgressReveal>
        <ProgressReveal
          progress={progress}
          range={[lastIndex - 0.4, lastIndex]}
          interactive={isLast}
        >
          <Button label="Sign In" variant="secondary" size="lg" fullWidth onPress={onSignIn} disabled={busy} />
        </ProgressReveal>
      </View>
    </View>
  );
}
