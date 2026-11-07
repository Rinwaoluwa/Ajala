import { router } from 'expo-router';

import { ForgotPasswordScreen, passwordResetRoutes } from '@features/auth';

export default function ForgotPasswordRoute() {
  return (
    <ForgotPasswordScreen
      onBack={() => router.back()}
      // The address is in the flow's memory; the code screen reads it from there.
      onCodeSent={() => router.push(passwordResetRoutes.code)}
      onSignIn={() => router.dismissTo(passwordResetRoutes.signIn)}
    />
  );
}
