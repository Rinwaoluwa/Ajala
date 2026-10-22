import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { signInRoutes, useSignOut } from '@features/auth';
import { Button, Logo, Screen, Text, TextLink, enterRise } from '@shared/components';
import { useLaunchHandedOff } from '@shared/state/LaunchState';
import { SCREEN_GUTTER } from '@shared/theme';

import { appLock } from '../../appLockModule';
import { biometricCopy } from '../biometricCopy';
import { useBiometricAvailability } from '../hooks/useBiometricAvailability';

/**
 * What a locked app shows. Not in the design: built from the sign-in screens'
 * parts — the wordmark, a heading, one primary action and a text link.
 *
 * The system prompt opens by itself once the launch splash has handed over (a
 * prompt over the splash would be the first thing anyone sees). Cancelling it
 * leaves the button to try again. "Use password instead" signs out and goes to
 * sign-in: the password is the way back for someone whose face or finger is not
 * recognised. A phone whose biometrics were since turned off offers only that.
 */
export function AppLockScreen({ onUnlocked }: { onUnlocked: () => void }) {
  const insets = useSafeAreaInsets();
  const handedOff = useLaunchHandedOff();
  const availability = useBiometricAvailability();
  const signOut = useSignOut();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const prompted = useRef(false);

  const copy = availability?.available ? biometricCopy(availability.kind) : null;

  const unlock = useCallback(async () => {
    if (!copy) return;
    setBusy(true);
    setFailed(false);
    const result = await appLock.authenticate(`Unlock AJALA with ${copy.name}`);
    setBusy(false);
    if (result === 'success') onUnlocked();
    else if (result === 'failed') setFailed(true);
  }, [copy, onUnlocked]);

  useEffect(() => {
    if (!handedOff || !copy || prompted.current) return;
    prompted.current = true;
    void unlock();
  }, [handedOff, copy, unlock]);

  const usePassword = () => {
    void signOut().then(() => router.replace(signInRoutes.options));
  };

  return (
    <Screen edges={['top']} padded={false} className="bg-background">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          padding: SCREEN_GUTTER,
        }}
      >
        <Animated.View entering={enterRise(0)} style={{ alignItems: 'center' }}>
          <Logo width={160} />
          <Text variant="headingXl" tone="heading" className="mt-32 text-center" accessibilityRole="header">
            Welcome back
          </Text>
          <Text variant="bodyMd" className="mt-8 text-center">
            {copy
              ? `Unlock AJALA with ${copy.name} to carry on.`
              : 'Biometric unlock is no longer set up on this phone. Sign in with your password instead.'}
          </Text>
          {failed ? (
            <Text
              variant="bodySm"
              tone="destructive"
              className="mt-12 text-center"
              accessibilityLiveRegion="polite"
            >
              {`${copy?.name ?? 'That'} didn't work. Try again, or use your password.`}
            </Text>
          ) : null}
        </Animated.View>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: SCREEN_GUTTER,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: 16,
          alignItems: 'center',
        }}
      >
        {copy ? (
          <View style={{ alignSelf: 'stretch' }}>
            <Button
              label={`Unlock with ${copy.name}`}
              size="lg"
              fullWidth
              loading={busy}
              onPress={() => void unlock()}
            />
          </View>
        ) : null}
        <TextLink label="Use password instead" onPress={usePassword} />
      </View>
    </Screen>
  );
}
