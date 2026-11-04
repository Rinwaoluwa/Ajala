import { router } from 'expo-router';

import { BlockedAccountsScreen } from '@features/settings';

/** Settings / Privacy & safety / Blocked accounts. */
export default function BlockedAccountsRoute() {
  return <BlockedAccountsScreen onBack={() => router.back()} />;
}
