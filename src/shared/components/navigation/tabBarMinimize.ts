import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Whether the tab bar is shrunk to its one round button (`FloatingTabBar`).
 *
 * A tab's main list reports its scrolling here (`useMinimizeTabBarOnScroll`):
 * scrolling down the page shrinks the bar out of the way, scrolling back up (or
 * reaching the top) brings it back. The bar itself brings it back when its
 * button is tapped and when the tab changes.
 *
 * One value for the whole app, because there is one tab bar. It lives outside
 * React so a list can report without re-rendering its screen: only the bar
 * listens.
 */

let minimized = false;
const listeners = new Set<() => void>();
/** When a tab's main list last moved, by the clock: see `lastListScrollAt`. */
let scrolledAt = 0;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => minimized;

export const tabBarMinimize = {
  set(next: boolean) {
    if (next === minimized) return;
    minimized = next;
    listeners.forEach((l) => l());
  },
  get: snapshot,
};

/**
 * When a tab's main list last scrolled (milliseconds, as `Date.now()`; 0 if
 * never). For work that should wait until nobody is scrolling: drawing the next
 * page ahead of a swipe to it must not land in the middle of a scroll.
 */
export const lastListScrollAt = () => scrolledAt;

export function useTabBarMinimized(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/**
 * How far one way the list must travel before the bar answers: far enough that
 * a resting thumb or a small correction does not flick it in and out.
 */
const TRAVEL = 24;

/**
 * For a tab's main list: spread the result onto the `FlatList` or `ScrollView`.
 *
 *   <FlatList {...minimizeOnScroll} … />
 *
 * It only reads the scroll position (a few numbers a frame); the bar's own
 * motion runs on the UI thread.
 */
export function useMinimizeTabBarOnScroll() {
  const last = useRef(0);
  const run = useRef(0);
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    scrolledAt = Date.now();
    const y = contentOffset.y;
    const dy = y - last.current;
    last.current = y;
    // At the top, or pulled past it (pull to refresh): always the whole bar.
    if (y <= 0) {
      run.current = 0;
      tabBarMinimize.set(false);
      return;
    }
    // Past the end: that is the list's bounce coming back, not the reader scrolling up.
    if (y >= contentSize.height - layoutMeasurement.height) {
      run.current = 0;
      return;
    }
    // A change of direction starts the count again.
    if (dy > 0 !== run.current > 0) run.current = 0;
    run.current += dy;
    if (run.current > TRAVEL) tabBarMinimize.set(true);
    else if (run.current < -TRAVEL) tabBarMinimize.set(false);
  }, []);
  return { onScroll, scrollEventThrottle: 16 } as const;
}
