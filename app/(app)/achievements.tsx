import { router, useLocalSearchParams } from 'expo-router';

import { AchievementsScreen } from '@features/profile';

/**
 * Badges and city stamps, worked out from the attended history: yours, or —
 * opened from someone's profile with `userId` and `name` — theirs.
 */
export default function AchievementsRoute() {
  const { userId, name } = useLocalSearchParams<{ userId?: string; name?: string }>();
  return (
    <AchievementsScreen
      person={userId ? { id: userId, firstName: name || 'Their' } : undefined}
      onBack={() => router.back()}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
