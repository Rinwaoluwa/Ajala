import { Stack } from 'expo-router';

import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';

export default function AuthLayout() {
  return <Stack screenOptions={useStackScreenOptions()} />;
}
