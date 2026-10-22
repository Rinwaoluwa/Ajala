import { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { AppSplash } from './AppSplash';

/**
 * The launch splash, drawn over the navigator rather than as a route.
 *
 * WHY AN OVERLAY. When the splash was the index route, finishing it meant
 * unmounting it and then letting the native stack animate the first real screen
 * in. For that stretch neither was on screen: a second or so of blank background
 * on every cold start, longer while a large photo decoded. As an overlay, the
 * first screen mounts and paints underneath, and the splash only fades once
 * navigation has actually happened. There is never a frame with nothing on it.
 *
 * `ready` should turn true once the app has routed away from the index.
 */

/**
 * The prototype reads as a hard cut or a dissolve too short to see. 150ms keeps
 * the cut's pace without the jolt; the spec warns against going past ~250.
 */
const FADE_MS = 150;

export type LaunchOverlayProps = {
  ready: boolean;
  /** Called as the overlay starts to fade: the screen beneath is now being revealed. */
  onHandOff: () => void;
  /** Called once the overlay has faded out and can be unmounted. */
  onDone: () => void;
};

export function LaunchOverlay({ ready, onHandOff, onDone }: LaunchOverlayProps) {
  const opacity = useSharedValue(1);

  const fadeOut = useCallback(() => {
    onHandOff();
    opacity.set(
      withTiming(0, { duration: FADE_MS }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [opacity, onHandOff, onDone]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]}>
      <AppSplash ready={ready} onComplete={fadeOut} />
    </Animated.View>
  );
}
