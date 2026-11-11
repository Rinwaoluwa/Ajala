import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * How an outlined (`secondary`, `neutral`) button draws its stroke.
 *
 * This is the cross-platform default, used on Android and web: the native button
 * draws no stroke at all (`styleBorder: null`), and `Button` lays a React Native
 * ring over it instead (`ring`), exactly the size of the button as it shows.
 *
 * Why: Compose always measures its button at least 48dp tall (the touch size),
 * while the app sets the pill to the design's height. The stroke was drawn round
 * that taller shape, so its top and bottom edges fell outside the button and
 * were cut off, leaving only the two rounded ends: ( Sign out ). A ring drawn in
 * React Native has the button's own bounds and can't be cut.
 *
 * iOS needs different treatment and overrides this in `buttonOutline.ios.ts`.
 */

export type ButtonOutline = {
  /** Border values to merge into the Expo UI `style` prop, or null to omit them. */
  styleBorder: { borderColor: string; borderWidth: number } | null;
  /** SwiftUI escape-hatch modifiers, unused off iOS. */
  modifiers?: ModifierConfig[];
  /** Inner fill for an outlined button that has none of its own. */
  fill?: string;
  /** The ring for `Button` to draw over the native button (Android, web). */
  ring?: { borderColor: string; borderWidth: number };
};

export function resolveButtonOutline(
  color: string | undefined,
  width: number,
  _radius: number,
  _surface: string,
): ButtonOutline {
  if (!color) return { styleBorder: null };
  return { styleBorder: null, ring: { borderColor: color, borderWidth: width } };
}
