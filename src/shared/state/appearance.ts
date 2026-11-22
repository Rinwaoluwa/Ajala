import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

import { getTheme } from '../theme';

/**
 * Light, dark, or the phone's own setting (Figma Settings / Appearance). Chosen
 * on this phone and kept here (it is not an account setting: API map §10,
 * "Client-only").
 *
 * Applying it sets React Native's `Appearance`, which everything follows:
 *   - NativeWind's scheme, and with it every `className` colour and the app's
 *     own `useAppColorScheme()` / `useTheme()`, in one render;
 *   - the native SwiftUI / Compose views, the status bar and the keyboard.
 *
 * `restoreAppearance()` runs once at launch, before the first screen is drawn
 * under the splash, so a dark choice never flashes light.
 */

export type AppearancePreference = 'system' | 'light' | 'dark';

const coverFor = (scheme: 'light' | 'dark') => getTheme(scheme).background;

const KEY = 'ajala.appearance.v1';

let preference: AppearancePreference = 'system';
const listeners = new Set<() => void>();

/**
 * One change, not two. NativeWind's `colorScheme.set` already calls
 * `Appearance.setColorScheme` itself; calling it again here fired a second
 * appearance change, so every screen re-rendered twice in a row and the switch
 * looked laggy and jagged. `Appearance` is set by hand only when NativeWind
 * refused (dark mode not class-based).
 */
function apply(next: AppearancePreference) {
  try {
    colorScheme.set(next);
  } catch {
    Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  }
}

/** Reads the saved choice and applies it. Safe to call more than once. */
export async function restoreAppearance(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      preference = saved;
      apply(saved);
      listeners.forEach((l) => l());
    }
  } catch {
    // Unreadable storage: keep following the phone.
  }
}

/**
 * A switch in progress, for `ThemeCrossfade`: the colour to cover the screen in
 * (the background being switched TO), the scheme that is on its way, and the
 * switch itself, to run once the cover is up.
 */
export type AppearanceTransition = { id: number; cover: string; to: 'light' | 'dark'; run: () => void };
let transition: AppearanceTransition | null = null;
const transitionListeners = new Set<() => void>();
let transitionId = 0;

/**
 * The phone's own scheme, for knowing what "System" will look like before it is
 * applied. Read as the app starts (before any choice is applied over it) and
 * kept up to date while the app follows the phone.
 */
let systemScheme: 'light' | 'dark' = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
Appearance.addChangeListener(({ colorScheme: next }) => {
  if (preference === 'system') systemScheme = next === 'dark' ? 'dark' : 'light';
});

export function setAppearance(next: AppearancePreference): void {
  if (next === preference) return;
  const leaving = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const arriving = next === 'system' ? systemScheme : next;

  // The choice itself, at once: the tick moves under the finger, and it is remembered.
  preference = next;
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(KEY, next).catch(() => undefined);

  let applied = false;
  const run = () => {
    if (applied) return;
    applied = true;
    apply(next);
  };

  // A switch still on its way (a second tap before the first had landed) gives way to this one.
  const pending = transition !== null;
  transition = null;

  // Nothing on screen changes (Dark chosen while the phone is already dark, say): no cover,
  // only the tick moves. The same when no crossfade is mounted.
  if (arriving === leaving || transitionListeners.size === 0) {
    if (pending) transitionListeners.forEach((l) => l());
    run();
    return;
  }

  // Applying the theme is not instant. The phone first re-styles every native view on its main
  // thread (measured 22 Nov on a debug simulator: 0.1–0.5s during which nothing at all can be
  // drawn), then React re-draws the screen, then glass and native icons catch up. Done bare,
  // that is a frozen screen, a late hard flip, and stragglers. So the screen fades to the
  // background it is going to straight away, the theme is applied under that cover, and the
  // new screen fades in when it is really there (`ThemeCrossfade`).
  transition = { id: ++transitionId, cover: coverFor(arriving), to: arriving, run };
  transitionListeners.forEach((l) => l());
}

/** Called by `ThemeCrossfade` once its cover has faded: the transition is over. */
export function endAppearanceTransition(id: number): void {
  if (transition?.id !== id) return;
  transition = null;
  transitionListeners.forEach((l) => l());
}

export function useAppearanceTransition(): AppearanceTransition | null {
  return useSyncExternalStore(
    (listener) => {
      transitionListeners.add(listener);
      return () => {
        transitionListeners.delete(listener);
      };
    },
    () => transition,
    () => transition,
  );
}

export function useAppearancePreference(): AppearancePreference {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => preference,
    () => preference,
  );
}
