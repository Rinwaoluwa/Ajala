import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { LocationAccessScreen, useLocationAccess } from '@features/location-access';
import { profileSetupRoutes } from '@features/profile';

/**
 * The start of setup: location first ("Turn on location to explore AJALA"),
 * because "Current city" and the app itself depend on it. Already allowed, it
 * goes straight on; allowed here, it goes on as soon as the system says so.
 */
export default function ProfileSetupStartRoute() {
  const { status, requesting, request, openSettings } = useLocationAccess();

  if (status === null) return <View className="flex-1 bg-background" />;
  if (status === 'granted') return <Redirect href={profileSetupRoutes.basics} />;
  return (
    <LocationAccessScreen
      status={status}
      busy={requesting}
      onAllow={() => void request()}
      onOpenSettings={openSettings}
    />
  );
}
