import { Link, router } from 'expo-router';

import { useUnreadChatsCount } from '@features/chat';
import { HomeScreen, homeRoutes } from '@features/home';
import { useUnreadNotificationsCount } from '@features/notifications';
import { profileRoutes } from '@features/profile';
import { useTabReselects } from '@shared/components';

/**
 * Home. Each post opens its page with iOS's zoom transition (iOS 18+): the post
 * grows into the full page and, on the way back, shrinks into its place in the
 * feed. Elsewhere it is the usual push. The post's photo, title and type travel
 * with it, so the page draws its header at once instead of an empty screen.
 *
 * While the zoom is in flight iOS hides the post it grew from. Posts now sit
 * straight on the page (no card of their own), so what shows in its place is
 * the page's own background, and nothing needs to stand in for it.
 */
export default function HomeRoute() {
  // The bell's and the chat button's badges come from their own features; home only draws them.
  const unreadCount = useUnreadNotificationsCount();
  const unreadChatsCount = useUnreadChatsCount();
  // The Home tab tapped while on Home: back to the top of the feed, the latest post.
  const toTop = useTabReselects('index');
  return (
    <HomeScreen
      toTopSignal={toTop}
      onChooseCity={(here) =>
        router.push({
          pathname: homeRoutes.travel,
          params: { place: here.label ?? '', teleported: here.teleported ? '1' : '' },
        })
      }
      onOpenPost={(post) => router.push({ pathname: '/(app)/post/[id]', params: { id: post.id } })}
      // The comment button: the same page, opened at its comments.
      onOpenComments={(post) =>
        router.push({
          pathname: '/(app)/post/[id]',
          params: { id: post.id, title: post.title, image: post.imageUrl ?? '', type: post.type, focus: 'comments' },
        })
      }
      onOpenHost={(hostId) => router.push({ pathname: profileRoutes.user, params: { id: hostId } })}
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
