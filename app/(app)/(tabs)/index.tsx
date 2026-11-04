import { Link, router } from 'expo-router';

import { HomeScreen, homeRoutes } from '@features/home';

/**
 * Home. Each card opens its post with iOS's zoom transition (iOS 18+): the card
 * grows into the full page and, on the way back, shrinks into its place in the
 * feed. Elsewhere it is the usual push. The card's photo, title and type travel
 * with it, so the page draws its header at once instead of an empty screen.
 */
export default function HomeRoute() {
  return (
    <HomeScreen
      onChooseCity={(city) =>
        router.push({ pathname: homeRoutes.travel, params: { city: city.name, country: city.countryCode } })
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
      onMessages={() => router.push('/(app)/messages')}
      onViewLevel={() => router.navigate('/(app)/(tabs)/profile')}
    />
  );
}
