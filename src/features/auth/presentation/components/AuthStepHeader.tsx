import { View } from 'react-native';

import {
  SCREEN_HEADER_HEIGHT,
  ScreenHeader,
  StepProgress,
  type StepProgressTone,
} from '@shared/components';

/**
 * A titled back bar with the step indicator 12pt below it, used by the multi-step
 * auth flows. The title and the highlighted segment are all that change between
 * steps, so each flow wraps this with its own constants rather than repeating them
 * on every screen.
 *
 * The last step of the password reset has no title or back arrow — the design puts
 * the bar alone at the top. Leaving `title` out holds that space open so the
 * indicator stays where it sits on every other step.
 */

export type AuthStepHeaderProps = {
  title?: string;
  count: number;
  /** Zero-based index of the current step. */
  step: number;
  tone?: StepProgressTone;
  onBack?: () => void;
};

export function AuthStepHeader({ title, count, step, tone, onBack }: AuthStepHeaderProps) {
  return (
    <View className="px-20">
      {title === undefined ? (
        <View style={{ height: SCREEN_HEADER_HEIGHT }} />
      ) : (
        <ScreenHeader title={title} onBack={onBack} />
      )}
      <View className="mt-12">
        <StepProgress count={count} current={step} tone={tone} />
      </View>
    </View>
  );
}
