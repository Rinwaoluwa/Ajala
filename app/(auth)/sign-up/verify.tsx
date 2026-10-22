import { router } from 'expo-router';

import { VerifyEmailScreen, nextStepRoutes, type NextStep } from '@features/auth';

/**
 * Reached from the sign-up form, and from sign-in when the account turned out to
 * be unverified. Either way the pending verification — the address, and from
 * sign-up the password the verify call must send — is already in the sign-up
 * flow, in memory.
 */
export default function VerifyEmailRoute() {
  return (
    <VerifyEmailScreen
      onBack={() => router.back()}
      // Confirming the code signs the person in; `GET /me` says where they go —
      // profile setup for a new account.
      onVerified={(next: NextStep) => router.replace(nextStepRoutes[next])}
    />
  );
}
