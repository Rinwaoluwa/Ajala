import { useEffect, useState } from 'react';

import type { BiometricAvailability } from '@core/biometrics/biometrics';

import { appLock } from '../../appLockModule';

/** What this phone offers — read once. Null until the answer lands. */
export function useBiometricAvailability(): BiometricAvailability | null {
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  useEffect(() => {
    let active = true;
    void appLock.availability().then((a) => {
      if (active) setAvailability(a);
    });
    return () => {
      active = false;
    };
  }, []);
  return availability;
}
