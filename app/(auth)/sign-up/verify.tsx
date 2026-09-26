import { router } from 'expo-router';

import { VerifyEmailScreen, signUpRoutes } from '@features/auth';

export default function VerifyEmailRoute() {
  return (
    <VerifyEmailScreen
      onBack={() => router.back()}
      // Replace, so Back from preferences does not return to a spent code.
      onVerified={() => router.replace(signUpRoutes.preferences)}
    />
  );
}
