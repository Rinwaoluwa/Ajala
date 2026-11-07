import { router, useLocalSearchParams } from 'expo-router';

import { TravelScreen } from '@features/home';
import { paymentRoutes } from '@features/payment';

export default function TravelRoute() {
  const {
    city = '',
    country = '',
    cityId,
    teleported,
  } = useLocalSearchParams<{ city?: string; country?: string; cityId?: string; teleported?: string }>();

  return (
    <TravelScreen
      current={{ id: cityId || undefined, name: city, countryCode: country }}
      teleported={teleported === '1'}
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
