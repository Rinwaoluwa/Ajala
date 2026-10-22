import { router } from 'expo-router';
import { useCallback } from 'react';

import { SavingProfileScreen, profileSetupRoutes } from '@features/profile';

/** Replaced once saved, so Back from the display name returns to the interests, not here. */
export default function SavingProfileRoute() {
  const onSaved = useCallback(() => router.replace(profileSetupRoutes.displayName), []);
  return <SavingProfileScreen onSaved={onSaved} />;
}
