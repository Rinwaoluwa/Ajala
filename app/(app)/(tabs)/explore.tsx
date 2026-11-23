import { router } from 'expo-router';

import { ExploreScreen, exploreRoutes } from '@features/explore';
import { homeRoutes } from '@features/home';
import { profileRoutes } from '@features/profile';
import { useTabReselects } from '@shared/components';

/**
 * The Explore tab: the map of activities around the person (API map §7).
 * Teleport opens Home's Travel picker, which owns teleporting; Explore only
 * asks for it when the map is past what a free reader's pins reach.
 */
export default function ExploreRoute() {
  // The Explore tab tapped while on Explore: the map back on where the person is.
  const toStart = useTabReselects('explore');
  return (
    <ExploreScreen
      toStartSignal={toStart}
      onOpenPost={(id, type) => router.push({ pathname: exploreRoutes.post, params: type ? { id, type } : { id } })}
      onTeleport={() => router.push(homeRoutes.travel)}
      onOpenPerson={(id) => router.push({ pathname: profileRoutes.user, params: { id } })}
    />
  );
}
