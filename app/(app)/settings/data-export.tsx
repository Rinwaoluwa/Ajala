import { router } from 'expo-router';

import { DataExportScreen } from '@features/settings';

/** Settings / Account & security / Download my data. */
export default function DataExportRoute() {
  return <DataExportScreen onBack={() => router.back()} />;
}
