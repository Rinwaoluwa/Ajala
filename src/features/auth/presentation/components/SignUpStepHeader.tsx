import { signUpDetailsCopy } from '../copy';
import { AuthStepHeader } from './AuthStepHeader';

/**
 * "Create account" with a back arrow and the three-step indicator. The same on
 * every step of sign-up; only the highlighted segment moves.
 *
 * The active step is Marigold, as on the password reset: the current Create
 * account frames (light and dark) moved it off teal, which ends that fork.
 */

export const SIGN_UP_STEPS = 3;

export type SignUpStepHeaderProps = {
  /** Zero-based: 0 details, 1 verification, 2 preferences. */
  step: number;
  onBack?: () => void;
};

export function SignUpStepHeader({ step, onBack }: SignUpStepHeaderProps) {
  return (
    <AuthStepHeader
      title={signUpDetailsCopy.header}
      count={SIGN_UP_STEPS}
      step={step}
      tone="accent"
      onBack={onBack}
    />
  );
}
