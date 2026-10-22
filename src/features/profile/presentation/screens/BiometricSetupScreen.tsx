import { Host } from '@expo/ui';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, View, useColorScheme } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { biometricCopy, useAppLockSetup, useBiometricAvailability } from '@features/app-lock';
import {
  Button,
  NativeIcon,
  Screen,
  ScreenHeader,
  Text,
  TextLink,
  enterRise,
  icons,
} from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { AllSetSheet } from '../components/AllSetSheet';
import { SetupIntro } from '../components/SetupIntro';
import { setupCopy } from '../copy';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * "Face ID sign-in" (Figma, light and dark), the last step of setup.
 *
 * "Enable Face ID" shows the system prompt and, if it passes, turns biometric
 * unlock on (`app-lock`): the app then asks for it each time it opens signed in.
 * "Not now" leaves it off. Either way "You're all set!" rises over the screen.
 *
 * The words and the glyph follow the phone: Face ID or Touch ID on an iPhone,
 * fingerprint or face unlock on Android. A face uses the design's art
 * (`face-id.svg`, and `face-id-dark.svg` on dark); a finger, the system glyph in
 * the same colours — Marigold on light, the text colour on dark. It enters a
 * beat after the copy.
 */

/** The design's Face ID art, one file per scheme (Marigold on light, near-white on dark). */
const FACE_ID_ART = {
  light: require('../../../../../assets/icons/face-id.svg') as number,
  dark: require('../../../../../assets/icons/face-id-dark.svg') as number,
};
const ART = 132;
/** Touch ID and fingerprint have no art in the design: the system glyph stands in. */
const GLYPH = 120;

export function BiometricSetupScreen({ onBack, onFinish }: { onBack: () => void; onFinish: () => void }) {
  const theme = useTheme();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const availability = useBiometricAvailability();
  const { enable } = useAppLockSetup();
  const { profile } = useProfileSetup();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  // Until the phone answers, say Face ID — the design's own words.
  const words = biometricCopy(availability?.available ? availability.kind : 'faceId');
  const copy = setupCopy.biometric;
  const glyphColor = dark ? theme.foreground : theme.accent;

  const turnOn = async () => {
    setBusy(true);
    setFailed(false);
    const on = await enable(copy.prompt(words.name));
    setBusy(false);
    if (on) setDone(true);
    else setFailed(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={['top']} padded={false}>
        <View className="px-20">
          <ScreenHeader title={words.header} onBack={onBack} />
        </View>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 28,
          }}
        >
          <SetupIntro title={words.headline} body={copy.body(words.name)} />
          <Animated.View entering={enterRise(120)} className="flex-1 items-center justify-center py-32">
            {words.icon === 'faceId' ? (
              <Image
                source={dark ? FACE_ID_ART.dark : FACE_ID_ART.light}
                style={{ width: ART, height: ART }}
                contentFit="contain"
                accessible={false}
              />
            ) : (
              <Host matchContents>
                <NativeIcon source={icons[words.icon]} size={GLYPH} color={glyphColor} />
              </Host>
            )}
          </Animated.View>
          <Animated.View entering={enterRise(180)}>
            <Text variant="bodyMd" className="text-center">
              {copy.instruction(words.name)}
            </Text>
            {failed ? (
              <Animated.View entering={FadeIn.duration(200)}>
                <Text
                  variant="bodySm"
                  tone="destructive"
                  className="mt-12 text-center"
                  accessibilityLiveRegion="polite"
                >
                  {copy.failed(words.name)}
                </Text>
              </Animated.View>
            ) : null}
          </Animated.View>
        </ScrollView>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 24,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}
        >
          <TextLink
            label={copy.notNow}
            emphasis="plain"
            onPress={() => setDone(true)}
            testID="biometric-not-now"
          />
          <View style={{ flex: 1 }}>
            <Button
              label={copy.enable(words.name)}
              size="lg"
              fullWidth
              loading={busy}
              disabled={!availability?.available}
              onPress={() => void turnOn()}
              testID="biometric-enable"
            />
          </View>
        </View>
      </Screen>
      <AllSetSheet isPresented={done} firstName={profile?.firstName ?? null} onStart={onFinish} />
    </View>
  );
}
