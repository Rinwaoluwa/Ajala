import { router } from 'expo-router';

import { AboutScreen } from '@features/settings';

/** Settings / About AJALA. */
export default function AboutRoute() {
  return <AboutScreen onBack={() => router.back()} />;
}
