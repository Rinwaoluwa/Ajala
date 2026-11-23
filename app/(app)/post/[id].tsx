import { router, useLocalSearchParams, usePreventZoomTransitionDismissal } from 'expo-router';
import { useEffect, useState } from 'react';

import { chatRoutes } from '@features/chat';
import { createPostRoutes } from '@features/create-post';
import { paymentRoutes, useSubscription } from '@features/payment';
import { PostDetailScreen, type PostPreview } from '@features/post-detail';
import { profileRoutes } from '@features/profile';

const TYPES: readonly PostPreview['type'][] = ['meetup', 'event', 'plan', 'group'];

/** How far in from the left edge a swipe back may start, as iOS's own back swipe. */
const BACK_SWIPE_EDGE = 28;

/**
 * Only a swipe from the left edge takes a zoomed page back (see the route).
 *
 * expo-router's hook reads once, as the page mounts, whether its zoom has been
 * registered, and never looks again; on a page opened from the feed that moment
 * is one render too early, so the bounds were never set and the page could
 * still be dragged from anywhere. Giving it the bounds again a frame later (a
 * point narrower first, so they count as changed) makes it read again, by which
 * time the zoom is there.
 */
function useBackSwipeFromEdgeOnly() {
  const [registered, setRegistered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRegistered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  usePreventZoomTransitionDismissal({
    unstable_dismissalBoundsRect: { maxX: registered ? BACK_SWIPE_EDGE : BACK_SWIPE_EDGE - 1 },
  });
}

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
 *
 * A page opened from the feed arrives with iOS's zoom, and iOS then lets the
 * whole page be picked up from anywhere and dragged about to send it back.
 * Scrolling the page or swiping its photos kept catching that, and the post
 * came away under the finger. Here only a swipe from the left edge goes back,
 * as on every other screen; anywhere else the page stays put.
 */
export default function PostRoute() {
  const { id, title, image, type, focus } = useLocalSearchParams<{
    id: string;
    title?: string;
    image?: string;
    type?: string;
    /** `comments`: open the page at its comments (a feed post's comment button). */
    focus?: string;
  }>();
  useBackSwipeFromEdgeOnly();
  const kind = TYPES.find((t) => t === type);
  // Plans are a Pro feature; while the subscription is still loading, nothing is locked.
  const { isPro, loading } = useSubscription();
  const preview: PostPreview | null = title && kind ? { title, imageUrl: image || null, type: kind } : null;

  return (
    <PostDetailScreen
      postId={id}
      preview={preview}
      // The type alone (Explore sends it without a title): enough to name a locked Plan.
      knownType={kind ?? null}
      openAt={focus === 'comments' ? 'comments' : undefined}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onOpenProfile={(userId) => router.push({ pathname: profileRoutes.user, params: { id: userId } })}
      onMessageHost={(userId) => router.push({ pathname: chatRoutes.start, params: { userId } })}
      onOpenGroupChat={(postId) => router.push({ pathname: chatRoutes.start, params: { postId } })}
      canSeePlans={isPro || loading}
      // A locked post (a Plan, or one outside their area): the paywall, saying which.
      onUnlock={(reason) =>
        router.push({ pathname: paymentRoutes.travelPaywall, params: reason === 'any' ? {} : { reason } })
      }
      // The host's "Edit post": the create wizard, filled in from this post, saving changes.
      onEditPost={(post) =>
        router.push({ pathname: createPostRoutes.wizard, params: { type: post.type, editId: post.id } })
      }
    />
  );
}
