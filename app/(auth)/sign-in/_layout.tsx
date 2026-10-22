import { Stack } from 'expo-router';

import { SignInFlowProvider } from '@features/auth';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

/**
 * The sign-in flow. The provider holds the credentials between the Sign In form
 * and the step-up Verification screen, in memory, and drops them when the flow
 * is left.
 */
export default function SignInLayout() {
  return (
    <SignInFlowProvider>
      <Stack screenOptions={useStackScreenOptions()} />
    </SignInFlowProvider>
  );
}
