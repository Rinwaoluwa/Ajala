import { useEffect, useRef, useState } from 'react';
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

/**
 * Drives the launch splash, from Figma "Splash / Initial" (Ajala_Splash_Animation_Spec.md §4.1).
 *
 * The design is a fixed 3s timeline, not a progress report. Startup here is a
 * font load and two storage reads, so there is no real percentage to show, and the
 * bar does not pretend to: it rests for 1.5s, sweeps once, and the screen holds.
 *
 *     0 – 1500 ms   static
 *  1500 – 2500 ms   the sweep: a warm head runs left to right, accelerating, with
 *                   the deep-teal fill behind it until the whole bar is covered
 *  2500 – 3000 ms   hold
 *          3000 ms  hand over to the first screen
 *
 * The hand-over waits for whichever is later: the end of the timeline, or the app
 * actually being ready. A slow start holds on the finished splash rather than
 * cutting to a screen that is not there yet.
 *
 * Reduce Motion skips the sweep: the bar is shown already filled and the splash
 * hands over after a short hold.
 *
 * The easing was fitted to the head positions measured from the prototype (§4.1):
 * t^1.5 lands within a few percent of every sample, where the spec's suggested
 * quad lags the head by a fifth of the bar mid-sweep.
 */

const SWEEP_DELAY_MS = 1500;
const SWEEP_MS = 1000;
const HAND_OFF_MS = 3000;
/** With Reduce Motion on: long enough to register the brand, no longer. */
const REDUCED_HAND_OFF_MS = 1000;

export const sweepEasing = Easing.poly(1.5);

export type UseSplashTimelineOptions = {
  /** True once startup work has finished and the first screen is drawn beneath. */
  ready: boolean;
  /** Called once, when the splash should give way. */
  onComplete: () => void;
};

export function useSplashTimeline({ ready, onComplete }: UseSplashTimelineOptions) {
  const reduceMotion = useReducedMotion();
  /** 0 = resting, 1 = the bar fully covered. Already eased. */
  const sweep = useSharedValue(reduceMotion ? 1 : 0);
  const [timelineDone, setTimelineDone] = useState(false);

  // Held in a ref so a new callback identity does not fire the hand-over twice.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!reduceMotion) {
      sweep.set(
        withDelay(SWEEP_DELAY_MS, withTiming(1, { duration: SWEEP_MS, easing: sweepEasing })),
      );
    }
    const timer = setTimeout(
      () => setTimelineDone(true),
      reduceMotion ? REDUCED_HAND_OFF_MS : HAND_OFF_MS,
    );
    return () => clearTimeout(timer);
  }, [reduceMotion, sweep]);

  const handedOff = useRef(false);
  useEffect(() => {
    if (!ready || !timelineDone || handedOff.current) return;
    handedOff.current = true;
    onCompleteRef.current();
  }, [ready, timelineDone]);

  return sweep;
}
