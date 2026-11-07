import { router } from 'expo-router';

import { PasswordResetCodeScreen, passwordResetRoutes } from '@features/auth';

/**
 * The emailed 6-digit reset code. A right code leaves a reset token in the
 * flow's memory, and this screen is replaced rather than stacked: the code is
 * spent, so going back from the new password returns to the email step.
 */
export default function PasswordResetCodeRoute() {
  return (
    <PasswordResetCodeScreen
      onBack={() => router.back()}
      onVerified={() => router.replace(passwordResetRoutes.newPassword)}
    />
  );
}
