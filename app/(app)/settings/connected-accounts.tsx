import { router } from 'expo-router';

import { ConnectedAccountsScreen, settingsRoutes } from '@features/settings';

/** Settings / Account & security / Connected accounts; "Set a password" opens Change password. */
export default function ConnectedAccountsRoute() {
  return (
    <ConnectedAccountsScreen
      onBack={() => router.back()}
      onNavigate={(to) => router.push(settingsRoutes[to])}
    />
  );
}
