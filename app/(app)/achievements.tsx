import { router } from 'expo-router';

import { AchievementsScreen } from '@features/profile';

/** Badges and city stamps, worked out from the attended history. */
export default function AchievementsRoute() {
  return (
    <AchievementsScreen
      onBack={() => router.back()}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
