import { Stack } from 'expo-router';

import { SignUpFlowProvider } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The sign-up flow. The provider holds the pending verification between the
 * details and verification screens, and is dropped when the flow is left.
 */
export default function SignUpLayout() {
  return (
    <SignUpFlowProvider>
      <Stack screenOptions={useStackScreenOptions()} />
    </SignUpFlowProvider>
  );
}
