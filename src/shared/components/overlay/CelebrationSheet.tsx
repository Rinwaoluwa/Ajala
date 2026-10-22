import { Image } from 'expo-image';
import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useTheme } from '@shared/hooks/useTheme';
import { SCREEN_GUTTER } from '@shared/theme';

import { Button } from '../ui/Button';
import { Text } from '../ui/Text';

/**
 * A sheet that celebrates the end of a flow (Figma "You're all set!"): the
 * screen behind washes pale teal, a sheet rises with an illustration, a heading,
 * a line of copy and one way forward.
 *
 * React Native rather than Expo UI's BottomSheet, which hosts only native
 * content: this one carries an SVG illustration and a Lottie burst over it. It
 * has a single action and no swipe-to-dismiss, because there is nowhere else to go.
 *
 * Motion: the wash fades in over 240ms while the sheet rises over 320ms
 * (ease-out). Once it has settled the confetti plays once from the
 * illustration. With Reduce Motion the sheet fades in where it sits and there
 * is no confetti — the illustration stays, still.
 *
 * Sizes: the illustration is 129pt; the confetti canvas is 240pt, centred on it
 * (see `assets/animations/confetti.json`), and may spill past it.
 */

const RISE_MS = 320;
const FADE_MS = 240;
const ILLUSTRATION = 129;
const CONFETTI = 240;
const RADIUS = 28;

export type CelebrationSheetProps = {
  isPresented: boolean;
  /** A bundled image (`require`), e.g. the party popper SVG. */
  illustration: number;
  /** A Lottie file played once over the illustration. */
  confetti?: AnimationObject;
  title: string;
  message: string;
  actionLabel: string;
  actionLoading?: boolean;
  onAction: () => void;
};

export function CelebrationSheet({
  isPresented,
  illustration,
  confetti,
  title,
  message,
  actionLabel,
  actionLoading = false,
  onAction,
}: CelebrationSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const lottie = useRef<LottieView>(null);
  const [height, setHeight] = useState(0);
  const shown = useSharedValue(0);

  // Started from the UI thread when the rise ends, so it must be a function of this runtime.
  const playConfetti = useCallback(() => lottie.current?.play(), []);

  useEffect(() => {
    if (!isPresented || height === 0) return;
    shown.value = withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished && !reduceMotion) scheduleOnRN(playConfetti);
    });
  }, [isPresented, height, reduceMotion, shown, playConfetti]);

  const scrimStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, (shown.value * RISE_MS) / FADE_MS),
  }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: reduceMotion ? shown.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - shown.value) * height }],
  }));

  if (!isPresented) return null;

  const measure = (e: LayoutChangeEvent) => setHeight(e.nativeEvent.layout.height);

  return (
    <View style={StyleSheet.absoluteFill} accessibilityViewIsModal>
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.celebrationScrim }, scrimStyle]}
      />
      <Animated.View
        onLayout={measure}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            // Hidden until measured, so the first frame is not drawn in place.
            opacity: height === 0 ? 0 : 1,
            backgroundColor: theme.surface,
            borderTopLeftRadius: RADIUS,
            borderTopRightRadius: RADIUS,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: 32,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
            alignItems: 'center',
          },
          sheetStyle,
        ]}
      >
        <View
          style={{ width: ILLUSTRATION, height: ILLUSTRATION }}
          importantForAccessibility="no-hide-descendants"
        >
          <Image
            source={illustration}
            style={{ width: ILLUSTRATION, height: ILLUSTRATION }}
            contentFit="contain"
          />
          {confetti && !reduceMotion ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: CONFETTI,
                height: CONFETTI,
                left: (ILLUSTRATION - CONFETTI) / 2,
                top: (ILLUSTRATION - CONFETTI) / 2,
              }}
            >
              <LottieView
                ref={lottie}
                source={confetti}
                autoPlay={false}
                loop={false}
                style={{ width: CONFETTI, height: CONFETTI }}
              />
            </View>
          ) : null}
        </View>
        <Text
          variant="headingMd"
          tone="accent"
          className="mt-20 text-center dark:text-heading"
          accessibilityRole="header"
        >
          {title}
        </Text>
        <Text variant="bodySm" tone="muted" className="mt-8 text-center">
          {message}
        </Text>
        <View className="mt-24 self-stretch">
          <Button label={actionLabel} size="lg" fullWidth loading={actionLoading} onPress={onAction} />
        </View>
      </Animated.View>
    </View>
  );
}
