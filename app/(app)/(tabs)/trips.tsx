import { router } from 'expo-router';

import { TripsScreen } from '@features/trips';

/** The Trips tab: what I host and what I went to (API map §8). */
export default function TripsRoute() {
  return (
    <TripsScreen
      onOpenTrip={(id) => router.push({ pathname: '/(app)/post/[id]', params: { id } })}
      onExplore={() => router.navigate('/(app)/(tabs)/explore')}
    />
  );
}
