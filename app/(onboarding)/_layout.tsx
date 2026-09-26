import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

export default function OnboardingLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
