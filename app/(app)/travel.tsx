import { router, useLocalSearchParams } from 'expo-router';

import { TravelScreen } from '@features/home';
import { paymentRoutes } from '@features/payment';

export default function TravelRoute() {
  const { place = '', teleported } = useLocalSearchParams<{ place?: string; teleported?: string }>();

  return (
    <TravelScreen
      current={{ label: place || null }}
      teleported={teleported === '1'}
      onBack={() => router.back()}
      onPaywall={(destination, homeCountryCode) =>
        router.push({
          pathname: paymentRoutes.travelPaywall,
          params: { city: destination?.name ?? '', from: homeCountryCode ?? '' },
        })
      }
    />
  );
}
