import { router } from 'expo-router';

import { ChangeEmailScreen } from '@features/settings';

/** Settings / Account & security / Email. */
export default function ChangeEmailRoute() {
  return <ChangeEmailScreen onBack={() => router.back()} />;
}
