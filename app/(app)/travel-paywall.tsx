import { router, useLocalSearchParams } from 'expo-router';

import { TravelPaywallScreen } from '@features/payment';

export default function TravelPaywallRoute() {
  const {
    city,
    country,
    from = '',
  } = useLocalSearchParams<{ city?: string; country?: string; from?: string }>();
  return (
    <TravelPaywallScreen
      city={city && country ? { name: city, countryCode: country } : null}
      homeCountryCode={from}
      onClose={() => router.back()}
    />
  );
}
