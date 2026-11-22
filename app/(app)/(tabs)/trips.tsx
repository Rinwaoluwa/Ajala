import { router } from 'expo-router';

import { TripsScreen } from '@features/trips';
import { useTabReselects } from '@shared/components';

/** The Trips tab: what I'm going to or host, what I asked to join, and what I went to (API map §8). */
export default function TripsRoute() {
  // The Trips tab tapped while on Trips: back to the top of the list.
  const toTop = useTabReselects('trips');
  return (
    <TripsScreen
      toTopSignal={toTop}
      onOpenTrip={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
