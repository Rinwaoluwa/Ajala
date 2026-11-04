import { router } from 'expo-router';

import { DeleteAccountScreen } from '@features/settings';

/** Settings / Account & security / Delete account. */
export default function DeleteAccountRoute() {
  return <DeleteAccountScreen onBack={() => router.back()} />;
}
