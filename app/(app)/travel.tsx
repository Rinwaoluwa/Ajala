import { router, useLocalSearchParams } from 'expo-router';

import { TravelScreen } from '@features/home';
import { paymentRoutes } from '@features/payment';

export default function TravelRoute() {
  const { city = '', country = '' } = useLocalSearchParams<{ city?: string; country?: string }>();

  return (
    <TravelScreen
      current={{ name: city, countryCode: country }}
      onBack={() => router.back()}
      onPaywall={(destination) =>
        router.push({
          pathname: paymentRoutes.travelPaywall,
          params: destination
            ? { city: destination.name, country: destination.countryCode, from: country }
            : { from: country },
        })
      }
    />
  );
}
