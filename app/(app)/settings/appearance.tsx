import { router } from 'expo-router';

import { AppearanceScreen } from '@features/settings';

/** Settings / Appearance. */
export default function AppearanceRoute() {
  return <AppearanceScreen onBack={() => router.back()} />;
}
