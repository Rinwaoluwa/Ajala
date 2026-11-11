import { router } from 'expo-router';

import { useUnreadNotificationsCount } from '@features/notifications';
import { OwnProfileScreen, profileRoutes } from '@features/profile';
import { settingsRoutes } from '@features/settings';

/**
 * The Profile tab (API map §9). Settings and Edit profile are the settings
 * feature's routes; signing out is in Settings.
 */
export default function ProfileRoute() {
  const unreadNotifications = useUnreadNotificationsCount();
  return (
    <OwnProfileScreen
      onSettings={() => router.push(settingsRoutes.hub)}
      onNotifications={() => router.push('/(app)/notifications')}
      unreadNotifications={unreadNotifications}
      onEditProfile={() => router.push(settingsRoutes.editProfile)}
      onSaved={() => router.push(profileRoutes.saved)}
      onAchievements={() => router.push(profileRoutes.achievements)}
      onOpenPost={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
    />
  );
}
