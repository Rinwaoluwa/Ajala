import { Link, router } from 'expo-router';

import { useUnreadChatsCount } from '@features/chat';
import { HomeScreen, homeRoutes } from '@features/home';
import { useUnreadNotificationsCount } from '@features/notifications';

/**
 * Home. Each card opens its post with iOS's zoom transition (iOS 18+): the card
 * grows into the full page and, on the way back, shrinks into its place in the
 * feed. Elsewhere it is the usual push. The card's photo, title and type travel
 * with it, so the page draws its header at once instead of an empty screen.
 */
export default function HomeRoute() {
  // The bell's and the chat button's badges come from their own features; home only draws them.
  const unreadCount = useUnreadNotificationsCount();
  const unreadChatsCount = useUnreadChatsCount();
  return (
    <HomeScreen
      onChooseCity={(here) =>
        router.push({
          pathname: homeRoutes.travel,
          params: { place: here.label ?? '', teleported: here.teleported ? '1' : '' },
        })
      }
      onOpenPost={(post) => router.push({ pathname: '/(app)/post/[id]', params: { id: post.id } })}
      linkCard={(post, card) => (
        <Link
          href={{
            pathname: '/(app)/post/[id]',
            params: { id: post.id, title: post.title, image: post.imageUrl ?? '', type: post.type },
          }}
          asChild
        >
          <Link.AppleZoom>{card}</Link.AppleZoom>
        </Link>
      )}
      onNotifications={() => router.push('/(app)/notifications')}
      unreadCount={unreadCount}
      onMessages={() => router.push('/(app)/messages')}
      unreadChatsCount={unreadChatsCount}
      onViewLevel={() => router.navigate('/(app)/(tabs)/profile')}
    />
  );
}
