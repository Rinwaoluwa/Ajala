import { router } from 'expo-router';

import { ExploreScreen, exploreRoutes } from '@features/explore';

/** The Explore tab: the map of activities around the person (API map §7). */
export default function ExploreRoute() {
  return <ExploreScreen onOpenPost={(id) => router.push({ pathname: exploreRoutes.post, params: { id } })} />;
}
