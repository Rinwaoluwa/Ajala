import { router, useLocalSearchParams, type Href } from 'expo-router';

import { openInApp } from '@core/links/openInApp';
import { ChatScreen } from '@features/chat';
import { lockedPostPaywall } from '@features/payment';
import { profileRoutes } from '@features/profile';

/** One conversation (Figma Chat 1:1 / Chat group). */
export default function ChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ChatScreen
      threadId={id}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/(app)/messages'))}
      // A locked tagged post (MOB-077) goes straight to the paywall, without asking for the post.
      onOpenPost={(postId, lockReason) =>
        lockReason
          ? router.push(lockedPostPaywall(lockReason))
          : router.push({ pathname: '/(app)/post/[id]', params: { id: postId } })
      }
      onOpenProfile={(userId) => router.push({ pathname: profileRoutes.user, params: { id: userId } })}
      // An Ajala post or profile link opens in the app; any other link in the in-app browser.
      onOpenLink={({ url, route }) => (route ? router.push(route as Href) : void openInApp(url))}
    />
  );
}
