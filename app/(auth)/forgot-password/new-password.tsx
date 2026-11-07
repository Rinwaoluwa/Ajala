import { router } from 'expo-router';

import { NewPasswordScreen, passwordResetRoutes } from '@features/auth';

/**
 * The last step of the reset. The reset token comes from the flow's memory, put
 * there by the code step — it is never read from, or written to, a URL.
 */
export default function NewPasswordRoute() {
  return (
    <NewPasswordScreen
      // Every device, this one included, is now signed out: sign in afresh.
      onReset={() => router.dismissTo(passwordResetRoutes.signIn)}
      onRestart={() => router.dismissTo(passwordResetRoutes.email)}
    />
  );
}
