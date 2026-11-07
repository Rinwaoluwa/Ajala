import { Stack } from 'expo-router';

import { PasswordResetFlowProvider } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The password-reset flow. The provider holds the address and the reset token
 * between the email, code and new-password screens, in memory only, and is
 * dropped when the flow is left.
 */
export default function ForgotPasswordLayout() {
  return (
    <PasswordResetFlowProvider>
      <Stack screenOptions={useStackScreenOptions()} />
    </PasswordResetFlowProvider>
  );
}
