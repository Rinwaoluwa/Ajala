import { router } from 'expo-router';

import { CitySearchScreen } from '@features/profile';

export default function CitySearchRoute() {
  return <CitySearchScreen onBack={() => router.back()} onDone={() => router.back()} />;
}
