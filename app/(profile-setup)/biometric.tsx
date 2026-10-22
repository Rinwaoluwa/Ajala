import { router } from 'expo-router';

import { appRoutes } from '@features/auth';
import { BiometricSetupScreen } from '@features/profile';

export default function BiometricSetupRoute() {
  return (
    <BiometricSetupScreen onBack={() => router.back()} onFinish={() => router.replace(appRoutes.home)} />
  );
}
