import { router, useLocalSearchParams } from 'expo-router';

import { TravelPaywallScreen } from '@features/payment';

/** `reason=plans`: opened from a Plan (creating or opening one), which is a Pro feature. */
export default function TravelPaywallRoute() {
  const { city, from, reason } = useLocalSearchParams<{ city?: string; from?: string; reason?: string }>();
  return (
    <TravelPaywallScreen
      city={city ? { name: city } : null}
      homeCountryCode={from || null}
      reason={reason === 'plans' ? 'plans' : 'teleport'}
      onClose={() => router.back()}
    />
  );
}
