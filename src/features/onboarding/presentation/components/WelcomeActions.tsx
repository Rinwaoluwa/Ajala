import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, ProgressReveal, buttonMetrics } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';

import { welcomeCopy } from '../copy';

/**
 * Sign up (filled) and Sign in (outlined): the welcome page's two ways in.
 *
 * Measured from the welcome frames: 50pt pills, 10pt apart, 16pt from the screen
 * edges and 40pt above the home indicator (`welcomeActionsInsets`).
 *
 * The entrance comes from outside, because the buttons appear in two places:
 *   - `swipe` — in the tour. `reveal` follows the pager from the last slide (0)
 *     to the welcome page (1): Sign up and then Sign in fade and rise in under the
 *     finger, and sink back out if the swipe is abandoned.
 *   - `fade`  — on the welcome screen alone. Both fade in together with no
 *     movement, once `reveal` is played from 0 to 1 (spec §4.2).
 *
 * The buttons only take touches once `interactive` says so: never while they are
 * still ghosted.
 */

const BUTTON_GAP = 10;
/** Above the home indicator. */
export const ACTIONS_BOTTOM_OFFSET = 40;
/** In from the screen edges. */
export const ACTIONS_SIDE_INSET = 16;

/** Where in `reveal` each button arrives, per entrance. */
const RANGES = {
  swipe: { signUp: [0.5, 0.9], signIn: [0.6, 1], rise: undefined },
  fade: { signUp: [0, 1], signIn: [0, 1], rise: 0 },
} as const;

export type WelcomeEntrance = keyof typeof RANGES;

/**
 * Height of the two-button stack, and of everything below it to the screen's
 * foot. Grows with the text-size setting, as the buttons do.
 */
export function useWelcomeActionsMetrics() {
  const insets = useSafeAreaInsets();
  const stackHeight = buttonMetrics.heightAt('lg', useFontScale()) * 2 + BUTTON_GAP;
  const bottomPadding = insets.bottom + ACTIONS_BOTTOM_OFFSET;
  return { stackHeight, bottomPadding, reservedBottom: stackHeight + bottomPadding };
}

export type WelcomeActionsProps = {
  reveal: SharedValue<number>;
  entrance: WelcomeEntrance;
  interactive: boolean;
  busy?: boolean;
  onSignUp: () => void;
  onSignIn: () => void;
};

export function WelcomeActions({
  reveal,
  entrance,
  interactive,
  busy = false,
  onSignUp,
  onSignIn,
}: WelcomeActionsProps) {
  const ranges = RANGES[entrance];

  return (
    <View style={{ gap: BUTTON_GAP }}>
      <ProgressReveal
        progress={reveal}
        range={ranges.signUp}
        rise={ranges.rise}
        interactive={interactive}
      >
        <Button
          label={welcomeCopy.signUp}
          variant="primary"
          size="lg"
          fullWidth
          onPress={onSignUp}
          loading={busy}
        />
      </ProgressReveal>
      <ProgressReveal
        progress={reveal}
        range={ranges.signIn}
        rise={ranges.rise}
        interactive={interactive}
      >
        <Button
          label={welcomeCopy.signIn}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={onSignIn}
          disabled={busy}
        />
      </ProgressReveal>
    </View>
  );
}
