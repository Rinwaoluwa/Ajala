import { router } from 'expo-router';

import { SafetyTipsScreen } from '@features/settings';

/** Settings / Privacy & safety / Safety tips. */
export default function SafetyTipsRoute() {
  return <SafetyTipsScreen onBack={() => router.back()} />;
}
