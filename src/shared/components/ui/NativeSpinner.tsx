import type { ColorValue } from 'react-native';

/**
 * An indeterminate spinner for use inside Expo UI content (a Host, a Button's
 * label, a BottomSheet) — where a React Native `ActivityIndicator` cannot go.
 *
 * Platform files: `NativeSpinner.ios.tsx` (SwiftUI `ProgressView`) and
 * `NativeSpinner.android.tsx` (Compose `CircularProgressIndicator`). This file
 * holds the types and the web fallback, which draws nothing.
 */

export type NativeSpinnerProps = {
  /** Diameter in points. */
  size: number;
  color: ColorValue;
};

export function NativeSpinner(_props: NativeSpinnerProps) {
  return null;
}
