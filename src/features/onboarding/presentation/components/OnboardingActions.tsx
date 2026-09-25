import { View } from 'react-native';

import { Button } from '@shared/components';

/**
 * The action area, which differs on the last slide.
 *
 * Slides 1–3: Skip on the left, Next on the right, space-between (Figma frame
 * 1171287759 — Horizontal, Fill, height 44, justify space-between).
 *
 * Last slide: the tour is over, so it offers the two ways into the app — Sign Up
 * filled and Sign In outlined, both full width and stacked.
 */

export type OnboardingActionsProps = {
  isLast: boolean;
  busy: boolean;
  onSkip: () => void;
  onNext: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
};

export function OnboardingActions({
  isLast,
  busy,
  onSkip,
  onNext,
  onSignUp,
  onSignIn,
}: OnboardingActionsProps) {
  if (isLast) {
    return (
      <View className="gap-12">
        <Button label="Sign Up" variant="primary" size="lg" fullWidth onPress={onSignUp} loading={busy} />
        <Button label="Sign In" variant="secondary" size="lg" fullWidth onPress={onSignIn} disabled={busy} />
      </View>
    );
  }

  return (
    <View className="flex-row items-center justify-between">
      <Button label="Skip" variant="ghost" size="md" onPress={onSkip} disabled={busy} />
      <Button label="Next" variant="primary" size="md" onPress={onNext} disabled={busy} />
    </View>
  );
}
