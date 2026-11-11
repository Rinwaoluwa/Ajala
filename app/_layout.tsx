import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLockGate } from '@features/app-lock';
import { ForceUpdateGate, OtaUpdateGate } from '@features/app-update';
import { AuthProvider } from '@features/auth';
import { LaunchOverlay } from '@bootstrap/splash/LaunchOverlay';
import { queryPersistOptions } from '@core/api/queryClient/persist';
import { queryClient } from '@core/api/queryClient/queryClient';
import { useStackScreenOptions } from '@shared/hooks/useStackScreenOptions';
import { restoreAppearance } from '@shared/state/appearance';
import { LaunchStateProvider } from '@shared/state/LaunchState';
import { fontAssets } from '@shared/theme';

import '../global.css';

// Called at module load, before React mounts, so the splash never flashes away early.
void SplashScreen.preventAutoHideAsync();
// The chosen Light / Dark / System, applied while the splash still covers the app.
void restoreAppearance();

export default function RootLayout() {
  const screenOptions = useStackScreenOptions();
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  // The index route has no segments; any destination has at least its group. The
  // pathname cannot tell them apart: groups are not part of it, so onboarding is "/" too.
  const segments = useSegments();
  // Handed off: the overlay has started to fade. Launched: it has gone.
  const [handedOff, setHandedOff] = useState(false);
  const [launched, setLaunched] = useState(false);
  const handleHandOff = useCallback(() => setHandedOff(true), []);
  const handleLaunched = useCallback(() => setLaunched(true), []);

  useEffect(() => {
    // Hide on error too — a missing font should not leave the user on a splash forever.
    // The launch overlay is already drawn in the same place, so nothing flashes.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    // Gestures (dragging a photo into a new place) need a root to attach to.
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      {/* Android draws the app edge to edge, so the keyboard no longer shrinks the
          window and covered every text box near the bottom (comments, chats, the
          create wizard, forms). This shrinks the app above the keyboard instead, as
          the window used to. iOS screens make their own room, so it is off there. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        enabled={Platform.OS === 'android'}
      >
      {/* The API cache, under everything that reads the API, restored from the last launch
          (`persist.ts`) so screens draw what they showed last time while they refresh. */}
      <PersistQueryClientProvider client={queryClient} persistOptions={queryPersistOptions}>
      {/* The session is app-wide state: the signed-in area guards on it and the
          entry route decides where to send people by it. */}
      <AuthProvider>
      <LaunchStateProvider handedOff={handedOff}>
      <StatusBar style="auto" />
      {/* Beneath the launch overlay, so the splash still covers a forced update. */}
      <ForceUpdateGate>
        {/* "Updating Ajala" while an over-the-air update installs; under a forced update. */}
        <OtaUpdateGate>
        {/* Biometric unlock, when turned on: over the app, under a forced update. */}
        <AppLockGate>
          <Stack screenOptions={screenOptions}>
            {/* The first screen appears under the launch overlay, so it needs no
                entrance of its own; one that animates in waits for the hand-off. */}
            <Stack.Screen name="index" options={{ animation: 'none' }} />
            <Stack.Screen name="(onboarding)" options={{ animation: 'none' }} />
          </Stack>
        </AppLockGate>
        </OtaUpdateGate>
      </ForceUpdateGate>
      {launched ? null : (
        // Ready once the index has routed somewhere: the destination is on screen beneath.
        <LaunchOverlay
          ready={segments.length > 0}
          onHandOff={handleHandOff}
          onDone={handleLaunched}
        />
      )}
      </LaunchStateProvider>
      </AuthProvider>
      </PersistQueryClientProvider>
      </KeyboardAvoidingView>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
