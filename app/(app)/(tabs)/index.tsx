import { router } from 'expo-router';

import { HomeScreen, homeRoutes } from '@features/home';

export default function HomeRoute() {
  return (
    <HomeScreen
      onChooseCity={(city) =>
        router.push({ pathname: homeRoutes.teleport, params: { city: city.name, country: city.countryCode } })
      }
      onOpenPost={(post) => router.push({ pathname: '/(app)/post/[id]', params: { id: post.id } })}
      onNotifications={() => router.push('/(app)/notifications')}
      onMessages={() => router.push('/(app)/messages')}
      onViewLevel={() => router.navigate('/(app)/(tabs)/profile')}
    />
  );
}
