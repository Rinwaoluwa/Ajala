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
 * Applying it sets both halves of the app's theming at once:
 *   - NativeWind's scheme, which drives every `className` colour;
 *   - React Native's `Appearance`, which drives `useColorScheme()` — so
 *     `useTheme()`, and the native SwiftUI / Compose views, the status bar and
 *     the keyboard follow too.
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
 * (the background being left) and the switch to make once it is covered.
 */
export type AppearanceTransition = { id: number; cover: string; run: () => void };
let transition: AppearanceTransition | null = null;
const transitionListeners = new Set<() => void>();
let transitionId = 0;

export function setAppearance(next: AppearancePreference): void {
  if (next === preference) return;
  preference = next;
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(KEY, next).catch(() => undefined);

  // The switch itself repaints the screen piece by piece (native views, glass and
  // icons each catch up in their own frame), which read as sluggish and jagged. So the
  // screen is covered in the background it is leaving, switched underneath, and the
  // cover fades away (`ThemeCrossfade`): one smooth fade, as iOS does its own switch.
  // Without a crossfade mounted, it switches a frame later, as before.
  const leaving = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const id = ++transitionId;
  let ran = false;
  const run = () => {
    if (ran) return;
    ran = true;
    apply(next);
  };
  transition = { id, cover: coverFor(leaving), run };
  transitionListeners.forEach((l) => l());
  if (transitionListeners.size === 0) requestAnimationFrame(run);
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
