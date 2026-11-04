import { router } from 'expo-router';

import { NotificationSettingsScreen } from '@features/settings';

/** Settings / Notifications (preferences). */
export default function NotificationSettingsRoute() {
  return <NotificationSettingsScreen onBack={() => router.back()} />;
}
