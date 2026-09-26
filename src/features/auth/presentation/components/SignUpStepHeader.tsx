import { View } from 'react-native';

import { ScreenHeader, StepProgress } from '@shared/components';

/**
 * "Create account" with a back arrow, and the three-step indicator 12pt below.
 * The same on every step of sign-up; only the highlighted segment moves.
 */

export const SIGN_UP_STEPS = 3;

export type SignUpStepHeaderProps = {
  /** Zero-based: 0 details, 1 verification, 2 preferences. */
  step: number;
  onBack?: () => void;
};

export function SignUpStepHeader({ step, onBack }: SignUpStepHeaderProps) {
  return (
    <View className="px-20">
      <ScreenHeader title="Create account" onBack={onBack} />
      <View className="mt-12">
        <StepProgress count={SIGN_UP_STEPS} current={step} />
      </View>
    </View>
  );
}
