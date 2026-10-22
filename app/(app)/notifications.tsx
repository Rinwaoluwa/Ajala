import { router } from 'expo-router';

import { PlaceholderScreen } from '@shared/components';

/** PLACEHOLDER — notifications are not built yet. */
export default function NotificationsRoute() {
  return <PlaceholderScreen title="Notifications" onBack={() => router.back()} />;
}
