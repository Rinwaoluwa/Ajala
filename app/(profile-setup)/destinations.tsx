import { router } from 'expo-router';

import { DestinationsScreen, profileSetupRoutes } from '@features/profile';

export default function DestinationsRoute() {
  return (
    <DestinationsScreen
      onBack={() => router.back()}
      onContinue={() => router.push(profileSetupRoutes.interests)}
    />
  );
}
