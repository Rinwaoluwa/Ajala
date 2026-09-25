import { View } from 'react-native';

import { Button, Reveal } from '@shared/components';

/**
 * The action area, which differs on the last slide.
 *
 * Slides 1–3: Skip on the left, Next on the right, space-between (Figma frame
 * 1171287759 — Horizontal, Fill, height 44, justify space-between).
 *
 * Last slide: the tour is over, so it offers the two ways into the app — Sign Up
 * filled and Sign In outlined, both full width and stacked. They rise in one after
 * the other when the slide arrives.
 *
 * The two layouts carry different keys. Without them React would reuse the Skip and
 * Next instances for Sign Up and Sign In (same types, same positions), the entrance
 * would never play, and the buttons would inherit the old sizing.
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
      <View key="final" className="gap-12">
        <Reveal index={0}>
          <Button label="Sign Up" variant="primary" size="lg" fullWidth onPress={onSignUp} loading={busy} />
        </Reveal>
        <Reveal index={1}>
          <Button label="Sign In" variant="secondary" size="lg" fullWidth onPress={onSignIn} disabled={busy} />
        </Reveal>
      </View>
    );
  }

  return (
    <View key="stepping" className="flex-row items-center justify-between">
      <Button label="Skip" variant="ghost" size="md" onPress={onSkip} disabled={busy} />
      <Button label="Next" variant="primary" size="md" onPress={onNext} disabled={busy} />
    </View>
  );
}
