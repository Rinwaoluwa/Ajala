import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Logo, ProgressBar } from '@shared/components';
import { useTheme } from '@shared/hooks/useTheme';

import { useSplashProgress } from './useSplashProgress';

/**
 * The launch screen: the Ajala lockup with a progress bar beneath it.
 *
 * Takes over from the native splash while startup finishes, drawn over the
 * navigator by `LaunchOverlay` so the first screen is already painted beneath it.
 * Layout follows the splash design: the lockup at its natural size, and a
 * pill-shaped bar below the tagline, centred as one group.
 *
 * Theme-aware. White behind the lockup in light mode and Night in dark mode, as in
 * the dark splash design, which keeps the lockup's own colours on Night. The bar uses
 * the themed track and primary.
 *
 * The native launch screen (expo-splash-screen in app.json) uses the same
 * backgrounds and draws the lockup at the same point, so the handover does not
 * flash or jump. That image is `assets/images/splash/splash-logo.png`: the lockup
 * with transparent space below it where this bar sits. If BAR_GAP or BAR_HEIGHT
 * changes, regenerate that image to match.
 *
 * ANDROID draws its native splash differently: Android 12+ puts the image in a
 * fixed icon slot and crops it to a 192dp circle, so a full-width lockup loses its
 * sides. There it gets `splash-logo-android.png` at 168dp (app.json), which fits the
 * circle, centred on the screen. This screen then starts its lockup at that same
 * size and position and settles it into the design's place while the bar fades in,
 * so the handover reads as one motion rather than a jump.
 */

/** Gap between the tagline and the bar, measured from the splash design. */
const BAR_GAP = 32;
const BAR_WIDTH = 207;
const BAR_HEIGHT = 8;

/** Lockup width on Android's native splash (app.json), for the settle-in below. */
const ANDROID_NATIVE_LOGO_WIDTH = 168;
const LOGO_WIDTH = 229;
/** The native splash centres the lockup; here the lockup-and-bar group is centred. */
const GROUP_OFFSET = (BAR_GAP + BAR_HEIGHT) / 2;
const SETTLE_MS = 450;
const settles = Platform.OS === 'android';

export type AppSplashProps = {
  ready: boolean;
  onComplete: () => void;
};

export function AppSplash({ ready, onComplete }: AppSplashProps) {
  const theme = useTheme();
  const progress = useSplashProgress({ ready, onComplete });
  const reduceMotion = useReducedMotion();

  // 0 = where Android's native splash left the lockup, 1 = the design's resting place.
  const settle = useSharedValue(settles && !reduceMotion ? 0 : 1);
  useEffect(() => {
    settle.set(withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }));
  }, [settle]);

  const logoStyle = useAnimatedStyle(() => {
    const t = settle.get();
    const startScale = ANDROID_NATIVE_LOGO_WIDTH / LOGO_WIDTH;
    return {
      transform: [
        { translateY: (1 - t) * GROUP_OFFSET },
        { scale: startScale + (1 - startScale) * t },
      ],
    };
  });
  const barStyle = useAnimatedStyle(() => ({ opacity: settle.get() }));

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.background,
      }}
    >
      <StatusBar style="auto" />
      <Animated.View style={logoStyle}>
        <Logo width={LOGO_WIDTH} />
      </Animated.View>
      <Animated.View style={[{ marginTop: BAR_GAP }, barStyle]}>
        <ProgressBar
          progress={progress}
          width={BAR_WIDTH}
          height={BAR_HEIGHT}
          accessibilityLabel="Loading Ajala"
        />
      </Animated.View>
    </View>
  );
}
