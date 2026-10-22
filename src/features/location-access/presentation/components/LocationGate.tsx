import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useLocationAccess } from '../hooks/useLocationAccess';
import { LocationAccessScreen } from '../screens/LocationAccessScreen';

/**
 * Holds the app behind "Turn on location" until location is allowed — Ajala
 * needs it to work. Children render only once it is.
 *
 * Until the first read lands it draws a plain background, not the screen, so a
 * person who has already allowed it never sees the gate flash past.
 */
export function LocationGate({ children }: { children: ReactNode }) {
  const { status, requesting, request, openSettings } = useLocationAccess();

  if (status === null) return <View className="flex-1 bg-background" />;
  if (status === 'granted') return <>{children}</>;
  return (
    <LocationAccessScreen
      status={status}
      busy={requesting}
      onAllow={() => void request()}
      onOpenSettings={openSettings}
    />
  );
}
