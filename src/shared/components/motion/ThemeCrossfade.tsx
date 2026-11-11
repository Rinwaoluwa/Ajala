import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { endAppearanceTransition, useAppearanceTransition, type AppearanceTransition } from '@shared/state/appearance';

/**
 * The theme switch as one smooth fade (Settings › Appearance). Left alone, the
 * switch repaints the screen piece by piece as native views, glass and icons
 * each catch up in their own frame, which reads as sluggish and jagged.
 *
 * So the screen is covered at once in the background it is leaving; once the
 * cover is on screen the theme switches underneath; two frames later, with the
 * new theme drawn, the cover fades away (260ms, on the UI thread, so it stays
 * smooth while the app is still busy). It never takes a touch.
 *
 * Mounted once, at the root, over everything but modals.
 */
export function ThemeCrossfade() {
  const transition = useAppearanceTransition();
  if (!transition) return null;
  // A fresh cover per switch, so it is created opaque rather than faded in.
  return <Cover key={transition.id} transition={transition} />;
}

function Cover({ transition }: { transition: AppearanceTransition }) {
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    const frames: number[] = [];
    const nextFrame = (fn: () => void) => frames.push(requestAnimationFrame(fn));
    // Two frames for the cover to reach the screen, then switch beneath it.
    nextFrame(() =>
      nextFrame(() => {
        transition.run();
        // Two more for the new theme to be drawn (native views a beat later), then fade.
        nextFrame(() =>
          nextFrame(() => {
            opacity.set(
              withDelay(
                60,
                withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) }, (finished) => {
                  if (finished) scheduleOnRN(endAppearanceTransition, transition.id);
                }),
              ),
            );
          }),
        );
      }),
    );
    return () => frames.forEach(cancelAnimationFrame);
  }, [transition, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: transition.cover }, style]}
    />
  );
}
