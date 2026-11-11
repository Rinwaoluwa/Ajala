import LottieView, { type AnimationObject } from 'lottie-react-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';

import { ConfettiShower } from '../motion/ConfettiShower';
import { Button } from '../ui/Button';
import { Text } from '../ui/Text';
import { Sheet } from './Sheet';
import { haptics } from '@shared/feedback/haptics';

/**
 * "Meetup published!", "Profile updated": a success worth celebrating.
 *
 * The moment, in order, once the sheet has risen:
 *   1. The badge pops: it grows from nothing past full size and settles, with
 *      a little tilt-wobble, as a success haptic fires.
 *   2. Two rings in the success colour ripple out from it and fade.
 *   3. Confetti bursts from the badge (`confetti.json`), while a shower of
 *      paper fires from both bottom corners of the screen (`ConfettiShower`).
 *   4. The heading, the line and the button rise in, one after another.
 *
 * Everything moves by scale, rotation and opacity: nothing around it shifts.
 * The confetti is drawn over the whole screen (the sheet's `overlay`) and never
 * takes a touch. With Reduce Motion the sheet simply appears, complete, with no
 * confetti. `celebrate` false keeps the same sheet, calm (saving changes to a
 * live post).
 *
 * React Native's `Sheet` rather than the native `StatusSheet`: nothing can be
 * drawn over a native sheet, so the confetti would not show.
 */

const CONFETTI = require('../../../../assets/animations/confetti.json') as AnimationObject;
const BADGE = 72;
/** The badge's confetti burst, centred on it. */
const BURST = 320;
/** After the sheet's 300ms rise, so the badge has stopped moving when it pops. */
const SETTLE_MS = 320;


export type SuccessSheetProps = {
  isPresented: boolean;
  /** What sits in the badge: a kind's art, a check. */
  art: ReactNode;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
  celebrate?: boolean;
  testID?: string;
};

export function SuccessSheet({
  isPresented,
  art,
  title,
  message,
  actionLabel,
  onAction,
  celebrate = false,
  testID,
}: SuccessSheetProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const animate = celebrate && !reduceMotion;
  const badge = useRef<View>(null);
  const lottie = useRef<LottieView>(null);
  // Where the badge's centre is on screen, once measured; the burst is drawn there.
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  // A new number fires the shower again.
  const [shower, setShower] = useState(0);

  const pop = useSharedValue(animate ? 0 : 1);
  const tilt = useSharedValue(0);
  const ring = useSharedValue(0);
  const reveal = useSharedValue(animate ? 0 : 1);

  // Cleared when the sheet closes, so the next opening starts from the beginning.
  const [wasPresented, setWasPresented] = useState(isPresented);
  if (wasPresented !== isPresented) {
    setWasPresented(isPresented);
    if (!isPresented) setOrigin(null);
  }

  useEffect(() => {
    if (!isPresented) {
      pop.set(animate ? 0 : 1);
      reveal.set(animate ? 0 : 1);
      ring.set(0);
      return;
    }
    if (!animate) {
      pop.set(1);
      reveal.set(1);
      return;
    }
    const timer = setTimeout(() => {
      pop.set(withSpring(1, { damping: 9, stiffness: 180, mass: 0.7 }));
      tilt.set(
        withSequence(
          withTiming(-9, { duration: 90 }),
          withTiming(7, { duration: 110 }),
          withTiming(-4, { duration: 110 }),
          withSpring(0, { damping: 8, stiffness: 200 }),
        ),
      );
      ring.set(0);
      ring.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
      reveal.set(withDelay(140, withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })));
      haptics.success();
      setShower((n) => n + 1);
      badge.current?.measureInWindow((x, y, width, height) => {
        setOrigin({ x: x + width / 2, y: y + height / 2 });
      });
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [isPresented, animate, pop, tilt, ring, reveal]);

  // The badge's burst plays once it is in place.
  useEffect(() => {
    if (origin) lottie.current?.play();
  }, [origin]);

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }, { rotate: `${tilt.value}deg` }],
  }));

  return (
    <Sheet
      isPresented={isPresented}
      onDismiss={onAction}
      overlay={
        animate ? (
          <>
            <ConfettiShower fire={shower} />
            {origin ? (
              <LottieView
                ref={lottie}
                source={CONFETTI}
                autoPlay={false}
                loop={false}
                style={{
                  position: 'absolute',
                  width: BURST,
                  height: BURST,
                  left: origin.x - BURST / 2,
                  top: origin.y - BURST / 2,
                }}
              />
            ) : null}
          </>
        ) : null
      }
    >
      <View style={{ alignItems: 'center', paddingTop: 8 }}>
        <View
          style={{ width: BADGE, height: BADGE, marginBottom: 20 }}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {animate ? (
            <>
              <Ripple progress={ring} color={theme.successTitle} delay={0} />
              <Ripple progress={ring} color={theme.successTitle} delay={0.22} />
            </>
          ) : null}
          <Animated.View
            ref={badge}
            collapsable={false}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: BADGE / 2,
                backgroundColor: theme.successSoft,
                alignItems: 'center',
                justifyContent: 'center',
              },
              badgeStyle,
            ]}
          >
            {art}
          </Animated.View>
        </View>
        <Rise progress={reveal} order={0}>
          <Text
            variant="headingLg"
            accessibilityRole="header"
            style={{ color: theme.successTitle, textAlign: 'center' }}
          >
            {title}
          </Text>
        </Rise>
        <Rise progress={reveal} order={1}>
          <Text variant="bodySm" tone="muted" style={{ textAlign: 'center', marginTop: 6 }}>
            {message}
          </Text>
        </Rise>
      </View>
      <Rise progress={reveal} order={2}>
        <View style={{ marginTop: 28 }}>
          <Button label={actionLabel} size="lg" fullWidth onPress={onAction} testID={testID} />
        </View>
      </Rise>
    </Sheet>
  );
}

/** A ring that grows out of the badge and fades; `delay` is a share of the run. */
function Ripple({ progress, color, delay }: { progress: SharedValue<number>; color: string; delay: number }) {
  const style = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (progress.value - delay) / (1 - delay)));
    return {
      opacity: progress.value <= delay || progress.value >= 1 ? 0 : 0.45 * (1 - t),
      transform: [{ scale: 1 + 1.1 * t }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: BADGE / 2, borderWidth: 2, borderColor: color },
        style,
      ]}
    />
  );
}

/** Rises a few points into place and fades in, each `order` a little after the last. */
function Rise({
  progress,
  order,
  children,
}: {
  progress: SharedValue<number>;
  order: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const start = order * 0.18;
    const t = Math.max(0, Math.min(1, (progress.value - start) / (1 - start)));
    return { opacity: t, transform: [{ translateY: 10 * (1 - t) }] };
  });
  return <Animated.View style={[{ alignSelf: 'stretch' }, style]}>{children}</Animated.View>;
}
