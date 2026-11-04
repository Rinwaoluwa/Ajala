import { router } from 'expo-router';

import { SessionsScreen } from '@features/settings';

/** Settings / Account & security / Sign-in activity. */
export default function SessionsRoute() {
  return <SessionsScreen onBack={() => router.back()} />;
}
