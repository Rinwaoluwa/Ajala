import { router } from 'expo-router';

import { SettingsScreen, settingsRoutes } from '@features/settings';

/** Settings (API map §10), opened from the profile's gear. */
export default function SettingsRoute() {
  return (
    <SettingsScreen
      onBack={() => router.back()}
      onNavigate={(to) => router.push(settingsRoutes[to])}
      onOpenProfile={() => router.navigate('/(app)/(tabs)/profile')}
    />
  );
}
