import { router } from 'expo-router';

import { InterestsScreen, profileSetupRoutes } from '@features/profile';

export default function InterestsRoute() {
  const save = () => router.push(profileSetupRoutes.saving);
  return <InterestsScreen onBack={() => router.back()} onContinue={save} onSkip={save} />;
}
