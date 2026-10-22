import { router } from 'expo-router';

import { ForgotPasswordScreen, passwordResetRoutes } from '@features/auth';

export default function ForgotPasswordRoute() {
  return (
    <ForgotPasswordScreen
      onBack={() => router.back()}
      // The API emails a link, so the flow ends here; the link re-enters the app
      // at the new-password screen.
      onDone={() => router.dismissTo(passwordResetRoutes.signIn)}
      onSignIn={() => router.dismissTo(passwordResetRoutes.signIn)}
    />
  );
}
