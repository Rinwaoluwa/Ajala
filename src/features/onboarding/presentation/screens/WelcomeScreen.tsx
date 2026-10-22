import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useLaunchHandedOff } from '@shared/state/LaunchState';

import { WelcomeBackdrop } from '../components/WelcomeBackdrop';
import {
  ACTIONS_SIDE_INSET,
  WelcomeActions,
  useWelcomeActionsMetrics,
} from '../components/WelcomeActions';
import type { OnboardingExit } from '../state/OnboardingState';

/**
 * The welcome page on its own — Figma "Splash / Continue" — for a returning
 * visitor who is signed out. The launch splash hands over to it.
 *
 * The buttons fade in over 300ms (spec §4.2), starting when the splash hands
 * over rather than on mount: this screen mounts beneath the splash seconds
 * earlier, where the fade would play unseen. They take touches once it ends.
 *
 * The prototype's samples (0.35 at 100ms, 0.9 at 200ms) are slower to start than
 * a plain ease-out. The reveal applies a cubic ease-out of its own, so the value
 * driving it eases in: the two compose to within a few percent of both samples.
 */

const FADE_MS = 300;

export type WelcomeScreenProps = {
  onExit: (intent: OnboardingExit) => void;
};

export function WelcomeScreen({ onExit }: WelcomeScreenProps) {
  const handedOff = useLaunchHandedOff();
  const { reservedBottom, bottomPadding } = useWelcomeActionsMetrics();
  const reveal = useSharedValue(0);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    if (!handedOff) return;
    reveal.set(
      withTiming(1, { duration: FADE_MS, easing: Easing.in(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(setInteractive, true);
      }),
    );
  }, [handedOff, reveal]);

  return (
    <View className="flex-1">
      <WelcomeBackdrop reservedBottom={reservedBottom} />
      <View
        style={{
          position: 'absolute',
          left: ACTIONS_SIDE_INSET,
          right: ACTIONS_SIDE_INSET,
          bottom: bottomPadding,
        }}
      >
        <WelcomeActions
          reveal={reveal}
          entrance="fade"
          interactive={interactive}
          onSignUp={() => onExit('signUp')}
          onSignIn={() => onExit('signIn')}
        />
      </View>
    </View>
  );
}
