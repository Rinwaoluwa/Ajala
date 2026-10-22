import { router } from 'expo-router';

import { PlaceholderScreen } from '@shared/components';

/** PLACEHOLDER — messaging is not built yet. */
export default function MessagesRoute() {
  return <PlaceholderScreen title="Messages" onBack={() => router.back()} />;
}
