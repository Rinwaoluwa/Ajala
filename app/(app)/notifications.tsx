import { router } from 'expo-router';

import { NotificationsScreen } from '@features/notifications';

/** The notifications list, opened from the home bell. */
export default function NotificationsRoute() {
  return (
    <NotificationsScreen
      onBack={() => router.back()}
      onOpenPost={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
    />
  );
}
