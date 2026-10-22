import { passwordResetCopy } from '../copy';
import { AuthStepHeader } from './AuthStepHeader';

/**
 * "Forgot password" with a back arrow and the three-step indicator, the active
 * step in Marigold as on sign-up.
 */

export const PASSWORD_RESET_STEPS = 3;

export type PasswordResetStepHeaderProps = {
  /** Zero-based: 0 email, 1 verification, 2 new password. */
  step: number;
  /**
   * The design drops the title and back arrow on the last step: the code has been
   * spent, so there is nowhere useful to go back to.
   */
  titled?: boolean;
  onBack?: () => void;
};

export function PasswordResetStepHeader({
  step,
  titled = true,
  onBack,
}: PasswordResetStepHeaderProps) {
  return (
    <AuthStepHeader
      title={titled ? passwordResetCopy.header : undefined}
      count={PASSWORD_RESET_STEPS}
      step={step}
      tone="accent"
      onBack={onBack}
    />
  );
}
