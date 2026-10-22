import { router } from 'expo-router';

import { TravelStyleScreen, profileSetupRoutes } from '@features/profile';

export default function TravelStyleRoute() {
  return (
    <TravelStyleScreen
      onBack={() => router.back()}
      onContinue={() => router.push(profileSetupRoutes.destinations)}
    />
  );
}
