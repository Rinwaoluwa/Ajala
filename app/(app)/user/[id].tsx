import { router, useLocalSearchParams } from 'expo-router';

import { PublicProfileScreen } from '@features/profile';

/** Another traveller's profile (`GET /users/:id`, API map §9). */
export default function UserRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PublicProfileScreen
      userId={id}
      onBack={() => router.back()}
      onOpenPost={(postId) => router.push({ pathname: '/(app)/post/[id]', params: { id: postId } })}
      onMessage={() => router.push('/(app)/messages')}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
