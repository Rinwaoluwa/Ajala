import { useState } from 'react';

import { openAppSettings, requestLocationPermission } from '@core/location/deviceLocation';

/**
 * "Turn on location" for a feed that answered NO_LOCATION: shows the system
 * prompt where it still can, else opens the app's page in Settings (a refusal
 * for good can only be undone there). `onGranted` then asks the feed again.
 */
export function useLocationPrompt(onGranted: () => void) {
  const [asking, setAsking] = useState(false);
  return {
    asking,
    turnOn: async () => {
      if (asking) return;
      setAsking(true);
      try {
        const permission = await requestLocationPermission();
        if (permission === 'granted') onGranted();
        else if (permission === 'blocked') openAppSettings();
      } finally {
        setAsking(false);
      }
    },
  };
}
