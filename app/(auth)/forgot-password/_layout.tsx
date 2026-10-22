import { Stack } from 'expo-router';

import { PasswordResetFlowProvider } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The password-reset flow. The provider holds the challenge between the email,
 * code and new-password screens, and is dropped when the flow is left.
 */
export default function ForgotPasswordLayout() {
  return (
    <PasswordResetFlowProvider>
      <Stack screenOptions={useStackScreenOptions()} />
    </PasswordResetFlowProvider>
  );
}
