import { Icon, type IconName } from '@expo/ui';
import type { ColorValue, ImageSourcePropType } from 'react-native';

/**
 * An icon for use inside Expo UI content (a Host, a Button label, a BottomSheet).
 *
 * Two kinds of source:
 *   - `symbol`: a tintable glyph. An SF Symbol on iOS; on Android, the `android`
 *     vector drawable (see `icons.ts` for the shared set).
 *   - `image`: a full-colour brand mark that must keep its own colours (the Google
 *     "G"). A PNG `require()` for iOS, and optionally an untinted vector drawable
 *     for Android.
 *
 * On its own in React Native layout, wrap it as
 * `<Host matchContents pointerEvents="none" ignoreSafeArea="all">`. Without
 * `ignoreSafeArea`, a Host near the top of the screen pads the icon away from the
 * status bar, and on a phone the gear on Profile was drawn below its circle.
 *
 * Platform files: `NativeIcon.ios.tsx` (SwiftUI) and `NativeIcon.android.tsx`
 * (Compose). This file holds the types and the web fallback.
 */

/** An SF Symbol name, as Expo UI types it. */
export type SFSymbol = Extract<IconName, string>;

export type NativeIconSource =
  | { symbol: SFSymbol; android?: ImageSourcePropType }
  | { image: number; android?: number };

export type NativeIconProps = {
  source: NativeIconSource;
  size: number;
  /** Tint for a `symbol`. Ignored for an `image`. */
  color?: ColorValue;
};

export function NativeIcon({ source, size, color }: NativeIconProps) {
  if ('symbol' in source && source.android) {
    return <Icon name={source.android} size={size} color={color} />;
  }
  return null;
}
