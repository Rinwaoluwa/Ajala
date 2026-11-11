import { router, useLocalSearchParams } from 'expo-router';

import { chatRoutes } from '@features/chat';
import { PublicProfileScreen, profileRoutes } from '@features/profile';

/**
 * Another traveller's profile (`GET /users/:id`, API map §9). Message opens the
 * chat feature's start route, which asks for the direct chat
 * (`POST /conversations { userId }`) and replaces itself with the thread.
 */
export default function UserRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PublicProfileScreen
      userId={id}
      onBack={() => router.back()}
      onOpenPost={(postId) => router.push({ pathname: '/(app)/post/[id]', params: { id: postId } })}
      onMessage={() => router.push({ pathname: chatRoutes.start, params: { userId: id } })}
      onAchievements={(name) =>
        router.push({ pathname: profileRoutes.achievements, params: { userId: id, name } })
      }
    />
  );
}
