import { router } from 'expo-router';

import { ConnectedAccountsScreen } from '@features/settings';

/** Settings / Account & security / Connected accounts. */
export default function ConnectedAccountsRoute() {
  return <ConnectedAccountsScreen onBack={() => router.back()} />;
}
