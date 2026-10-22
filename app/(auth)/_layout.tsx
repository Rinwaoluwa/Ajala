import { Stack } from 'expo-router';

import { SignUpFlowProvider } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The auth stack. The session provider is mounted at the root, above this.
 *
 * The pending email verification lives here, not in the sign-up stack, because
 * both sign-up and sign-in (an unverified account) hand one to the verify screen.
 */
export default function AuthLayout() {
  return (
    <SignUpFlowProvider>
      <Stack screenOptions={useStackScreenOptions()} />
    </SignUpFlowProvider>
  );
}
