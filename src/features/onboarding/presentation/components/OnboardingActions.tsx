import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { Button, ProgressReveal, Text } from '@shared/components';
import { useFontScale } from '@shared/hooks/useFontScale';

import { ACTIONS_SIDE_INSET, WelcomeActions, useWelcomeActionsMetrics } from './WelcomeActions';

/**
 * The tour's action bar, fixed at the foot of the screen while the slides move
 * behind it.
 *
 * On the slides: Skip on the left and Next on the right, each 94pt wide, so
 * Skip's label sits where Next's is mirrored (measured from the onboarding
 * frames). On the welcome page: Sign up and Sign in.
 *
 * The change follows the swipe. Both sets are always mounted and read the
 * pager's live `progress`: in the first half of the swipe onto the welcome page
 * Skip and Next fade away, in the second half Sign up and then Sign in rise in.
 * Swiping back plays it in reverse, and a Next tap drives it the same way because
 * it scrolls the same pager.
 *
 * The bar is always as tall as the Sign up / Sign in stack — taller at a larger
 * text size — so nothing above it moves as the buttons change. Skip and Next sit
 * on its bottom edge. Touch and screen-reader focus follow the settled page, so a
 * half-faded button cannot be tapped.
 */

const ACTION_WIDTH = 94;

export type OnboardingActionsProps = {
  /** Live pager position in pages. */
  progress: SharedValue<number>;
  /** 0 on the last slide, 1 on the welcome page. */
  welcomeReveal: SharedValue<number>;
  welcomeIndex: number;
  /** Whether the pager has settled on the welcome page. */
  isWelcome: boolean;
  busy: boolean;
  error: string | null;
  onSkip: () => void;
  onNext: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
};

export function OnboardingActions({
  progress,
  welcomeReveal,
  welcomeIndex,
  isWelcome,
  busy,
  error,
  onSkip,
  onNext,
  onSignUp,
  onSignIn,
}: OnboardingActionsProps) {
  const { stackHeight, bottomPadding } = useWelcomeActionsMetrics();
  // The design's 94pt at the default size; each button widens with the label (about 40pt
  // more at 2x) so "Next" never wraps, and two still fit a 320pt screen.
  const actionWidth = ACTION_WIDTH + Math.round((useFontScale() - 1) * 40);

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: ACTIONS_SIDE_INSET,
        paddingBottom: bottomPadding,
      }}
    >
      {error ? (
        <Text variant="bodySm" tone="destructive" className="pb-8 text-center">
          {error}
        </Text>
      ) : null}

      <View style={{ height: stackHeight }} pointerEvents="box-none">
        <ProgressReveal
          progress={progress}
          range={[welcomeIndex - 1, welcomeIndex - 0.5]}
          mode="out"
          interactive={!isWelcome}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        >
          <View className="flex-row items-center justify-between">
            <View style={{ width: actionWidth }}>
              <Button label="Skip" variant="ghost" size="md" fullWidth onPress={onSkip} disabled={busy} />
            </View>
            <View style={{ width: actionWidth }}>
              <Button label="Next" variant="primary" size="md" fullWidth onPress={onNext} disabled={busy} />
            </View>
          </View>
        </ProgressReveal>

        <View style={{ position: 'absolute', left: 0, right: 0, top: 0 }} pointerEvents="box-none">
          <WelcomeActions
            reveal={welcomeReveal}
            entrance="swipe"
            interactive={isWelcome}
            busy={busy}
            onSignUp={onSignUp}
            onSignIn={onSignIn}
          />
        </View>
      </View>
    </View>
  );
}
