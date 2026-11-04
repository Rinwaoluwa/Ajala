import { router } from 'expo-router';

import { MessagesScreen, chatRoutes } from '@features/chat';

/** Messages (Figma Messages): the conversations, opened from the home header's chat icon. */
export default function MessagesRoute() {
  return (
    <MessagesScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/(tabs)'))}
      onOpenThread={(id) => router.push({ pathname: chatRoutes.thread, params: { id } })}
      onExplore={() => router.replace('/(app)/(tabs)/explore')}
    />
  );
}
