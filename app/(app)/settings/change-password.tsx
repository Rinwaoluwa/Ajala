import { router } from 'expo-router';

import { ChangePasswordScreen } from '@features/settings';

/** Settings / Account & security / Change password. */
export default function ChangePasswordRoute() {
  return <ChangePasswordScreen onBack={() => router.back()} />;
}
