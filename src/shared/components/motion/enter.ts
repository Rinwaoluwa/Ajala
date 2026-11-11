import { useCallback, useEffect, useState } from 'react';
import { Easing, FadeInDown, ReduceMotion } from 'react-native-reanimated';

/**
 * The app's entrance for content arriving on a screen: a 300ms fade with an 8pt
 * rise, ease-out. Pass `delay` to stagger a column (40–80ms apart reads as one
 * movement, not a queue).
 *
 * Under Reduce Motion Reanimated skips layout animations entirely, so content is
 * simply there — the setting's intent for an entrance.
 *
 *   <Animated.View entering={enterRise(60)}>…</Animated.View>
 */
export const ENTER_MS = 300;
const RISE = 8;

export function enterRise(delay = 0) {
  return FadeInDown.duration(ENTER_MS)
    .delay(delay)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: RISE }] })
    .reduceMotion(ReduceMotion.System);
}

/**
 * The entrance for rows of a virtualized list (FlatList): `enter(index)` gives
 * the first few rows their staggered rise, but only while the list first
 * appears.
 *
 * A FlatList unmounts rows far off screen and mounts them again when they come
 * back, and a row mounted again plays its `entering` again: scroll down a long
 * feed and back up, and the first cards rose in a second time, as if the page
 * were moving by itself. Here the entrance is only handed out during the first
 * `windowMs` after `ready` (the first page landed); after that rows simply are.
 */
export function useListEntrance(ready: boolean, windowMs = 900) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!ready || done) return;
    const timer = setTimeout(() => setDone(true), windowMs);
    return () => clearTimeout(timer);
  }, [ready, done, windowMs]);
  return useCallback(
    (index: number, max = 3, step = 60) => (!done && index < max ? enterRise(index * step) : undefined),
    [done],
  );
}
