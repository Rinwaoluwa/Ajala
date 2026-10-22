import { router } from 'expo-router';
import { useState } from 'react';

import { useBiometricAvailability } from '@features/app-lock';
import { appRoutes } from '@features/auth';
import { DisplayNameScreen, profileSetupRoutes } from '@features/profile';

/**
 * After the display name: biometric sign-in where the phone has it, otherwise
 * "You're all set!" here, and then the app.
 */
export default function DisplayNameRoute() {
  const biometrics = useBiometricAvailability();
  const [allSet, setAllSet] = useState(false);

  return (
    <DisplayNameScreen
      onBack={() => router.back()}
      onChosen={() => {
        if (!biometrics?.available) return false;
        router.push(profileSetupRoutes.biometric);
        return true;
      }}
      allSet={{
        isPresented: allSet,
        present: () => setAllSet(true),
        onStart: () => router.replace(appRoutes.home),
      }}
    />
  );
}
