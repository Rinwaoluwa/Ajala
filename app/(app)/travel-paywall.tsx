import { router, useLocalSearchParams } from 'expo-router';

import { TravelPaywallScreen } from '@features/payment';

export default function TravelPaywallRoute() {
  const { city, from } = useLocalSearchParams<{ city?: string; from?: string }>();
  return (
    <TravelPaywallScreen
      city={city ? { name: city } : null}
      homeCountryCode={from || null}
      onClose={() => router.back()}
    />
  );
}
