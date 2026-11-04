import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Whether surfaces should be drawn in Liquid Glass right now.
 *
 * True only when all of these hold:
 *   - iOS 26 or later, in a build made with Xcode 26 (`isLiquidGlassAvailable`);
 *   - the glass API really exists on this build of iOS — some iOS 26 betas lacked
 *     it and crashed (`isGlassEffectAPIAvailable`);
 *   - the person has not turned on Reduce Transparency, which asks for solid
 *     surfaces. That setting is followed live: switching it changes the surfaces
 *     without a restart.
 *
 * Android and older iPhones get `false`, and every glass surface falls back to
 * the solid colours of the Figma design (`GlassSurface`).
 */

const capable = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    // The native module is missing (an old development build, a test run).
    return false;
  }
})();

let reduceTransparency = false;
const listeners = new Set<() => void>();

if (capable) {
  void AccessibilityInfo.isReduceTransparencyEnabled().then((on) => {
    reduceTransparency = on;
    listeners.forEach((l) => l());
  });
  AccessibilityInfo.addEventListener('reduceTransparencyChanged', (on) => {
    reduceTransparency = on;
    listeners.forEach((l) => l());
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => capable && !reduceTransparency;

export function useLiquidGlass(): boolean {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
