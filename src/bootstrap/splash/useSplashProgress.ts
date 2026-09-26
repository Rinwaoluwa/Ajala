import { useEffect, useRef } from 'react';
import { Easing, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/**
 * Drives the splash progress bar.
 *
 * Startup here is a font load and one AsyncStorage read — there is no meaningful
 * percentage to report. So the bar is honest about pace, not about precision: it
 * crawls towards CRAWL_TARGET while startup is running, then finishes the moment
 * the app is actually ready. It never reaches 100% before the work is done, and it
 * never sits at 100% after.
 *
 * MIN_VISIBLE_MS stops a warm start from flashing the splash for a single frame,
 * which reads as a glitch rather than a loader.
 *
 * These timings are product choices, not values from the design file.
 */

/** Where the bar parks while waiting. Kept short of full so "done" stays meaningful. */
const CRAWL_TARGET = 0.85;
const CRAWL_MS = 1600;
/** Shortest time the splash is on screen, even when startup is instant. */
const MIN_VISIBLE_MS = 1200;
/** The final fill once the app is ready. */
const FINISH_MS = 300;

export type UseSplashProgressOptions = {
  /** True once startup work has finished. */
  ready: boolean;
  /** Called once the bar has visibly reached 100%. */
  onComplete: () => void;
};

export function useSplashProgress({ ready, onComplete }: UseSplashProgressOptions) {
  const progress = useSharedValue(0);
  const shownAt = useRef<number | null>(null);

  // Held in a ref so a new callback identity does not restart the finish animation.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    shownAt.current = Date.now();
    progress.set(withTiming(CRAWL_TARGET, { duration: CRAWL_MS, easing: Easing.out(Easing.quad) }));
  }, [progress]);

  useEffect(() => {
    if (!ready) return;

    const elapsed = Date.now() - (shownAt.current ?? Date.now());
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const finish = () => onCompleteRef.current();

    progress.set(
      withDelay(
        wait,
        withTiming(1, { duration: FINISH_MS, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(finish);
        }),
      ),
    );
  }, [ready, progress]);

  return progress;
}
