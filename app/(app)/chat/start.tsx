import { router, useLocalSearchParams } from 'expo-router';

import { StartChatScreen, chatRoutes } from '@features/chat';

/**
 * Opens a chat from another screen: `{ userId }` for a direct chat with that
 * person, `{ postId }` for the post's group chat (`chatRoutes.start`). Once the
 * API answers, the thread replaces this route, so Back returns to the profile
 * or post rather than to a loading screen.
 */
export default function StartChatRoute() {
  const { userId, postId } = useLocalSearchParams<{ userId?: string; postId?: string }>();
  return (
    <StartChatScreen
      userId={userId}
      postId={postId}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/messages'))}
      onStarted={(id) => router.replace({ pathname: chatRoutes.thread, params: { id } })}
    />
  );
}
