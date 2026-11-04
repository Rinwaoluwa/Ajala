import { router, useLocalSearchParams } from 'expo-router';

import { PostDetailScreen, type PostPreview } from '@features/post-detail';
import { profileRoutes } from '@features/profile';

const TYPES: readonly PostPreview['type'][] = ['meetup', 'event', 'plan', 'group'];

/**
 * The post page (`GET /posts/:postId`, API map §6). Opened from a feed card, the
 * card's title, photo and type come along (`title`, `image`, `type`), so the page
 * draws its header straight away while the rest loads.
 */
export default function PostRoute() {
  const { id, title, image, type } = useLocalSearchParams<{
    id: string;
    title?: string;
    image?: string;
    type?: string;
  }>();
  const kind = TYPES.find((t) => t === type);
  const preview: PostPreview | null = title && kind ? { title, imageUrl: image || null, type: kind } : null;

  return (
    <PostDetailScreen
      postId={id}
      preview={preview}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onOpenProfile={(userId) => router.push({ pathname: profileRoutes.user, params: { id: userId } })}
    />
  );
}
