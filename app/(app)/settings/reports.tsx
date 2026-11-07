import { router } from 'expo-router';

import { ReportsScreen } from '@features/settings';

/** Settings / Privacy & safety / Reports: what the person has reported. */
export default function ReportsRoute() {
  return <ReportsScreen onBack={() => router.back()} />;
}
