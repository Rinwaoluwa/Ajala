import { router, useLocalSearchParams } from 'expo-router';

import { ChatScreen } from '@features/chat';

/** One conversation (Figma Chat 1:1 / Chat group). */
export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ChatScreen
      threadId={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/messages'))}
      onOpenPost={(postId) => router.push({ pathname: '/(app)/post/[id]', params: { id: postId } })}
    />
  );
}
