import { router, useLocalSearchParams } from 'expo-router';

import { chatRoutes } from '@features/chat';
import { createPostRoutes } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';
import { PostDetailScreen, type PostPreview } from '@features/post-detail';
import { profileRoutes } from '@features/profile';

const TYPES: readonly PostPreview['type'][] = ['meetup', 'event', 'plan', 'group'];

/**
 * The post page (`GET /posts/:postId`, API map §6). Opened from a feed card, the
 * card's title, photo and type come along (`title`, `image`, `type`), so the page
 * draws its header straight away while the rest loads.
 *
 * Message (a direct chat with the host) and Group chat (the post's own chat,
 * made automatically when it went live; for the host and the people going) both
 * open the chat start route, which asks the API for the conversation (`POST
 * /conversations { userId }` or `{ postId }`) and moves on to the thread. That
 * route says so when someone going is still waiting for a place in a full chat.
 */
export default function PostRoute() {
  const { id, title, image, type } = useLocalSearchParams<{
    id: string;
    title?: string;
    image?: string;
    type?: string;
  }>();
  const kind = TYPES.find((t) => t === type);
  // Plans are a Pro feature; while the subscription is still loading, nothing is locked.
  const { isPro, loading } = useSubscription();
  const preview: PostPreview | null = title && kind ? { title, imageUrl: image || null, type: kind } : null;

  return (
    <PostDetailScreen
      postId={id}
      preview={preview}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onOpenProfile={(userId) => router.push({ pathname: profileRoutes.user, params: { id: userId } })}
      onMessageHost={(userId) => router.push({ pathname: chatRoutes.start, params: { userId } })}
      onOpenGroupChat={(postId) => router.push({ pathname: chatRoutes.start, params: { postId } })}
      canSeePlans={isPro || loading}
      // A locked post (a Plan, or one outside their area): the paywall, saying which.
      onUnlock={(reason) => router.push({ pathname: paymentRoutes.travelPaywall, params: { reason } })}
      // The host's "Edit post": the create wizard, filled in from this post, saving changes.
      onEditPost={(post) =>
        router.push({ pathname: createPostRoutes.wizard, params: { type: post.type, editId: post.id } })
      }
    />
  );
}
