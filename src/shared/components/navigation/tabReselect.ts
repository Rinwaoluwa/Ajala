import { useEffect, useRef, useSyncExternalStore } from 'react';

/**
 * Tapping the tab you are already on takes that tab back to its beginning: the
 * top of the feed on Home, the top of a list on Trips and Profile, the map
 * centred on you again on Explore.
 *
 * The tab bar's owner says a tab was tapped again (`tabReselected`). A tab's
 * route follows how many times (`useTabReselects`) and hands that number to its
 * screen, which acts when it changes (`useOnSignal`). So a screen never needs
 * to know which tab it is shown in.
 */

const counts = new Map<string, number>();
const listeners = new Set<() => void>();

/** The tab bar's owner: the tab already in front was tapped again. */
export function tabReselected(key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** How many times this tab has been tapped while already in front. Changes on each such tap. */
export function useTabReselects(key: string): number {
  const read = () => counts.get(key) ?? 0;
  return useSyncExternalStore(subscribe, read, read);
}

/**
 * Runs `run` each time `signal` changes after the first render: a screen's "go
 * back to your beginning". Nothing happens on mount, whatever the number is by then.
 */
export function useOnSignal(signal: number | undefined, run: () => void): void {
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  const seen = useRef(signal);
  useEffect(() => {
    if (signal === seen.current) return;
    seen.current = signal;
    latest.current();
  }, [signal]);
}
