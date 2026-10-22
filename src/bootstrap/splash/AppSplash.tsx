import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Logo, SwirlPattern, logoHeight } from '@shared/components';
import { palette } from '@shared/theme';

import { LOADER_HEIGHT, LOADER_WIDTH, SplashLoader } from './SplashLoader';
import { useSplashTimeline } from './useSplashTimeline';

/**
 * The launch screen, Figma "Splash / Initial": a deep teal gradient with the swirl
 * pattern, the white logo with marigold dots at the centre, and the loader bar
 * below it. Timing is in `useSplashTimeline`, the bar in `SplashLoader`.
 *
 * Takes over from the native splash while startup finishes, drawn over the
 * navigator by `LaunchOverlay` so the first screen is already painted beneath it.
 *
 * The same in both colour schemes: the design has one loading screen, and it is
 * already dark.
 *
 * THE NATIVE HANDOVER differs per platform, because the native launch screens do.
 *
 * iOS shows this screen without its bar as the launch image
 * (`assets/images/splash/launch-ios.png`, full screen, `cover`). This screen starts
 * on exactly that frame and lays itself out the way `cover` scales the image —
 * the 393×852 design scaled by whichever of width or height needs more, about the
 * screen's centre; the swirl uses `cover` too, so it lines up as well. The bar is
 * the one thing the handover adds: it fades in, rising a few points, and then
 * sweeps. If the logo or colours change, regenerate the launch image.
 *
 * ANDROID 12+ can only show a flat colour and an icon, which it crops to a 192dp
 * circle; a full-width logo loses its sides. There it is flat brand teal with the
 * white logo at 168dp (`splash-wordmark-android.png`), so this screen starts on
 * that flat teal with its logo at that size, then fades the gradient and pattern
 * in and settles the logo to the design's size while the bar fades in — one
 * motion rather than a cut.
 *
 * The bar's entrance finishes well inside the timeline's 1.5s rest, so the sweep
 * always starts on a settled bar.
 */

/** Measured from the design at 393pt. The spec estimated ≈195. */
const LOGO_WIDTH = 196;
const LOGO_HEIGHT = logoHeight(LOGO_WIDTH);
/** From the logo's centre to the bar's centre, measured (the spec estimated ≈80). */
const BAR_OFFSET = 75;

/** The design frame the iOS launch image is drawn at. */
const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 852;

/** Lockup width on Android's native splash (app.json), for the settle-in below. */
const ANDROID_NATIVE_LOGO_WIDTH = 168;
const SETTLE_MS = 450;
const settles = Platform.OS === 'android';
/** The gradient and pattern arriving over Android's flat teal. */
const BACKDROP_FADE_MS = 300;
/** The bar arriving at the handover: a short fade with a small rise. */
const BAR_ENTER_MS = 350;
const BAR_RISE = 4;

const GRADIENT = `linear-gradient(to bottom, ${palette.teal}, ${palette.tealDark})`;
/** The swirl is drawn in deep teal over the gradient, as in the design. */
const PATTERN_OPACITY = 0.6;

export type AppSplashProps = {
  ready: boolean;
  onComplete: () => void;
};

export function AppSplash({ ready, onComplete }: AppSplashProps) {
  const sweep = useSplashTimeline({ ready, onComplete });
  const reduceMotion = useReducedMotion();
  const { width, height } = useWindowDimensions();
  // How `cover` scales the launch image on this screen.
  const coverScale = Math.max(width / FRAME_WIDTH, height / FRAME_HEIGHT);

  // 0 = what Android's native splash left on screen, 1 = this screen's design.
  const settle = useSharedValue(settles && !reduceMotion ? 0 : 1);
  // 0 = not yet drawn (neither launch screen has a bar), 1 = in place.
  const barEnter = useSharedValue(0);
  useEffect(() => {
    settle.set(withTiming(1, { duration: SETTLE_MS, easing: Easing.out(Easing.cubic) }));
    barEnter.set(withTiming(1, { duration: BAR_ENTER_MS, easing: Easing.out(Easing.cubic) }));
  }, [settle, barEnter]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, (settle.get() * SETTLE_MS) / BACKDROP_FADE_MS),
  }));
  const logoStyle = useAnimatedStyle(() => {
    if (!settles) return {};
    const startScale = ANDROID_NATIVE_LOGO_WIDTH / (LOGO_WIDTH * coverScale);
    return { transform: [{ scale: startScale + (1 - startScale) * settle.get() }] };
  });
  const barStyle = useAnimatedStyle(() => {
    const t = barEnter.get();
    return {
      opacity: t,
      transform: [{ translateY: reduceMotion ? 0 : (1 - t) * BAR_RISE }],
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: palette.teal }}>
      <StatusBar style="light" />
      <Animated.View
        style={[StyleSheet.absoluteFill, { experimental_backgroundImage: GRADIENT }, backdropStyle]}
      >
        <SwirlPattern color={palette.tealDark} opacity={PATTERN_OPACITY} />
      </Animated.View>

      {/* The logo is centred on the screen, where the native splash draws it; the
          bar hangs below without moving it. The group scales as one, about the
          logo's centre, which is the screen's. */}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <View style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT, transform: [{ scale: coverScale }] }}>
          <Animated.View style={logoStyle}>
            <Logo width={LOGO_WIDTH} tone="inverse" />
          </Animated.View>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: LOGO_HEIGHT / 2 + BAR_OFFSET - LOADER_HEIGHT / 2,
                left: (LOGO_WIDTH - LOADER_WIDTH) / 2,
              },
              barStyle,
            ]}
          >
            <SplashLoader sweep={sweep} />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}
