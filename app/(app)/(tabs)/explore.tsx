import { router } from 'expo-router';

import { ExploreScreen, exploreRoutes } from '@features/explore';
import { homeRoutes } from '@features/home';

/**
 * The Explore tab: the map of activities around the person (API map §7).
 * Teleport opens Home's Travel picker, which owns teleporting; Explore only
 * asks for it when the map is past what a free reader's pins reach.
 */
export default function ExploreRoute() {
  return (
    <ExploreScreen
      onOpenPost={(id) => router.push({ pathname: exploreRoutes.post, params: { id } })}
      onTeleport={() => router.push(homeRoutes.travel)}
    />
  );
}
