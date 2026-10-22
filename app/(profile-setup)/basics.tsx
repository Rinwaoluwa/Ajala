import { router } from 'expo-router';

import { ProfileBasicsScreen, ProfileSetupGate, profileSetupRoutes } from '@features/profile';

export default function ProfileBasicsRoute() {
  return (
    <ProfileSetupGate>
      <ProfileBasicsScreen
        onChooseCity={() => router.push(profileSetupRoutes.city)}
        onContinue={() => router.push(profileSetupRoutes.travelStyle)}
      />
    </ProfileSetupGate>
  );
}
