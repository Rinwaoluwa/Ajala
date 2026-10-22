import { router } from 'expo-router';

import { PlaceholderScreen } from '@shared/components';

/** PLACEHOLDER — the post page (`GET /posts/:postId`, API map §6) is not drawn yet. */
export default function PostRoute() {
  return <PlaceholderScreen title="Post" body="The post page is coming soon." onBack={() => router.back()} />;
}
