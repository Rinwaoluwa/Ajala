import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * On Android the app itself shrinks above the keyboard (app/_layout.tsx), so a
 * bar at the foot of a screen is lifted with it: nothing to do here. See the
 * iOS file for the bar that rides the keyboard.
 */
export function KeyboardStickyBar({ children }: { children: ReactNode; gap?: number }) {
  return <View>{children}</View>;
}
