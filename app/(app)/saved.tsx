import { router } from 'expo-router';

import { SavedActivitiesScreen } from '@features/profile';

/** Saved activities: bookmarked posts, kept on this phone (no saves API yet). */
export default function SavedRoute() {
  return (
    <SavedActivitiesScreen
      onBack={() => router.back()}
      onOpenPost={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
