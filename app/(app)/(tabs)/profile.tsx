import { router } from 'expo-router';

import { OwnProfileScreen, profileRoutes } from '@features/profile';
import { settingsRoutes } from '@features/settings';

/**
 * The Profile tab (API map §9). Settings and Edit profile are the settings
 * feature's routes; signing out is in Settings.
 */
export default function ProfileRoute() {
  return (
    <OwnProfileScreen
      onSettings={() => router.push(settingsRoutes.hub)}
      onMessages={() => router.push('/(app)/messages')}
      onEditProfile={() => router.push(settingsRoutes.editProfile)}
      onSaved={() => router.push(profileRoutes.saved)}
      onAchievements={() => router.push(profileRoutes.achievements)}
      onOpenPost={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
    />
  );
}
