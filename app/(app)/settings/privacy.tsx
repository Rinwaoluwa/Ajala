import { router } from 'expo-router';

import { PrivacySafetyScreen, settingsRoutes } from '@features/settings';

/** Settings / Privacy & safety. */
export default function PrivacySafetyRoute() {
  return (
    <PrivacySafetyScreen onBack={() => router.back()} onNavigate={(to) => router.push(settingsRoutes[to])} />
  );
}
