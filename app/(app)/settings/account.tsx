import { router } from 'expo-router';

import { AccountSecurityScreen, settingsRoutes } from '@features/settings';

/** Settings / Account & security. */
export default function AccountSecurityRoute() {
  return (
    <AccountSecurityScreen
      onBack={() => router.back()}
      onNavigate={(to) => router.push(settingsRoutes[to])}
    />
  );
}
