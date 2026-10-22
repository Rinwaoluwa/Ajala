import { router, useLocalSearchParams } from 'expo-router';

import { TeleportPaywallScreen } from '@features/payment';

export default function TeleportPaywallRoute() {
  const {
    city,
    country,
    from = '',
  } = useLocalSearchParams<{ city?: string; country?: string; from?: string }>();
  return (
    <TeleportPaywallScreen
      city={city && country ? { name: city, countryCode: country } : null}
      homeCountryCode={from}
      onClose={() => router.back()}
    />
  );
}
