import { router, useLocalSearchParams } from 'expo-router';

import { NewPasswordScreen, passwordResetRoutes } from '@features/auth';

/**
 * Reached from the link the API emails:
 * `ajala://forgot-password/new-password?token=…`.
 *
 * The token is a one-time capability, so it stays in the URL only long enough to
 * be read here and is never written anywhere else.
 */
export default function NewPasswordRoute() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return (
    <NewPasswordScreen
      token={token ?? null}
      onReset={() => router.dismissTo(passwordResetRoutes.signIn)}
    />
  );
}
