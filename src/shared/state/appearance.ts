import AsyncStorage from '@react-native-async-storage/async-storage';
import { colorScheme } from 'nativewind';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

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

export function setAppearance(next: AppearancePreference): void {
  if (next === preference) return;
  preference = next;
  listeners.forEach((l) => l());
  // The tick on the chosen row draws first; the app-wide repaint follows a frame later,
  // so the tap answers at once instead of waiting on every screen's re-render.
  requestAnimationFrame(() => apply(next));
  void AsyncStorage.setItem(KEY, next).catch(() => undefined);
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
