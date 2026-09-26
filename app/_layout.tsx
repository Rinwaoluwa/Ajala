import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LaunchOverlay } from '@bootstrap/splash/LaunchOverlay';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';
import { fontAssets } from '@shared/theme';

import '../global.css';

// Called at module load, before React mounts, so the splash never flashes away early.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const screenOptions = useStackScreenOptions();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // The index route has no segments; any destination has at least its group. The
  // pathname cannot tell them apart: groups are not part of it, so onboarding is "/" too.
  const segments = useSegments();
  const [launched, setLaunched] = useState(false);
  const handleLaunched = useCallback(() => setLaunched(true), []);

  useEffect(() => {
    // Hide on error too — a missing font should not leave the user on a splash forever.
    // The launch overlay is already drawn in the same place, so nothing flashes.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={screenOptions}>
        {/* The first screen appears under the launch overlay, so it needs no entrance of its own. */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
      </Stack>
      {launched ? null : (
        // Ready once the index has routed somewhere: the destination is on screen beneath.
        <LaunchOverlay ready={segments.length > 0} onDone={handleLaunched} />
      )}
    </SafeAreaProvider>
  );
}
