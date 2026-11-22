import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
import { useLiquidGlass } from '@shared/hooks/useLiquidGlass';
import { endAppearanceTransition, useAppearanceTransition, type AppearanceTransition } from '@shared/state/appearance';

/**
 * The theme switch as one smooth change (Settings › Appearance).
 *
 * Applying a theme takes time, and none of it can be hurried: the phone
 * re-styles every native view on its main thread (nothing can be drawn
 * meanwhile), React re-draws the screen, and Liquid Glass and native icons
 * follow a little after. Left bare, that is a tap that seems ignored, a late
 * hard flip, and stragglers. So:
 *
 *   1. On the tap, the screen fades to the background it is going TO (`IN_MS`).
 *      It starts at once and runs on the UI thread, so the tap is answered
 *      whatever else is going on.
 *   2. When the cover is up, the theme is applied under it. Not before: the
 *      phone's own re-styling would freeze the fade half-way.
 *   3. The cover holds until the new theme is really on screen. That is
 *      something it sees, not a count of frames: this component is itself
 *      re-drawn in the new scheme (it changes in the same render as
 *      everything else), and a frame has then arrived on time.
 *   4. It fades away (`OUT_MS`; longer where there is Liquid Glass, which takes
 *      its own time to turn).
 *
 * Earlier versions got 3 wrong (counted two frames and faded, so the cover
 * left over the OLD theme and the screen flipped afterwards) and then 2
 * (applied the theme first and covered late, leaving the screen frozen for as
 * long as the phone took).
 *
 * If the scheme never arrives (the phone's own setting changed under the app,
 * and "System" turned out to be what was already showing), it gives up after
 * `MAX_WAIT_MS` and fades away over an unchanged screen.
 *
 * It never takes a touch. Mounted once, at the root, over everything but modals.
 */

const IN_MS = 120;
/**
 * The reveal where there is Liquid Glass. As long as glass takes to turn: glass takes its
 * light or dark look from what is behind it, so a glass button only starts to change once
 * the new background is drawn, and takes about 300ms over it. The reveal eases in (it stays
 * nearly opaque at first), so the glass finishes under it instead of showing as a pale disc
 * on a dark page.
 */
const OUT_GLASS_MS = 300;
/** Without Liquid Glass (Android, older iPhones) nothing straggles, so the reveal is brisker. */
const OUT_MS = 200;
/** A frame this soon after the last means the app has caught up. */
const ON_TIME_MS = 40;
/** After the new theme has been drawn, how long to wait for that before fading anyway. */
const MAX_SETTLE_MS = 300;
/** How long to wait for the new theme at all, once it has been asked for. */
const MAX_WAIT_MS = 2000;

export function ThemeCrossfade() {
  const transition = useAppearanceTransition();
  if (!transition) return null;
  // A fresh cover per switch.
  return <Cover key={transition.id} transition={transition} />;
}

function Cover({ transition }: { transition: AppearanceTransition }) {
  const opacity = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  // Re-drawn with everything else when the scheme changes: its own arrival is the signal.
  const arrived = useAppColorScheme() === transition.to;
  const glass = useLiquidGlass();
  const leaving = useRef(false);
  const switchUnderIt = useCallback(() => transition.run(), [transition]);

  // 1 and 2. Fade to the new background; when it is up, apply the theme under it.
  useEffect(() => {
    opacity.set(
      withTiming(1, { duration: IN_MS, easing: Easing.out(Easing.quad) }, () => {
        scheduleOnRN(switchUnderIt);
      }),
    );
    // Should the fade never report back, the theme is still applied (`run` only acts once).
    const fallback = setTimeout(switchUnderIt, IN_MS + 200);
    return () => clearTimeout(fallback);
  }, [opacity, switchUnderIt]);

  // 3 and 4. Once the new theme is on screen and a frame has come on time, fade away.
  useEffect(() => {
    let frame = 0;
    const fadeOut = () => {
      if (leaving.current) return;
      leaving.current = true;
      opacity.set(
        withTiming(0, { duration: glass ? OUT_GLASS_MS : OUT_MS, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(endAppearanceTransition, transition.id);
        }),
      );
    };

    if (!arrived) {
      const giveUp = setTimeout(fadeOut, IN_MS + MAX_WAIT_MS);
      return () => clearTimeout(giveUp);
    }

    const since = Date.now();
    let last = since;
    const watch = () => {
      const now = Date.now();
      if (now - last <= ON_TIME_MS || now - since >= MAX_SETTLE_MS) fadeOut();
      else {
        last = now;
        frame = requestAnimationFrame(watch);
      }
    };
    frame = requestAnimationFrame(watch);
    return () => cancelAnimationFrame(frame);
  }, [arrived, glass, transition, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { backgroundColor: transition.cover }, style]}
    />
  );
}
