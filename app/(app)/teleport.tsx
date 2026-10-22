import { router, useLocalSearchParams } from 'expo-router';

import { TeleportScreen } from '@features/home';
import { paymentRoutes } from '@features/payment';

export default function TeleportRoute() {
  const { city = '', country = '' } = useLocalSearchParams<{ city?: string; country?: string }>();
  const current = { name: city, countryCode: country };

  return (
    <TeleportScreen
      current={current}
      onBack={() => router.back()}
      onChooseCity={(destination) =>
        router.push({
          pathname: paymentRoutes.teleportPaywall,
          params: { city: destination.name, country: destination.countryCode, from: country },
        })
      }
      onPro={() => router.push({ pathname: paymentRoutes.teleportPaywall, params: { from: country } })}
    />
  );
}
