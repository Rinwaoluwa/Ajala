import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * How an outlined (`secondary`) button draws its stroke.
 *
 * This is the cross-platform default, used on Android and web. Expo UI's Android
 * transform already handles a border with a radius correctly — it layers a
 * border-coloured background, pads by the stroke width, then clips an inner
 * background — so passing `borderColor`/`borderWidth` through `style` is right here.
 *
 * iOS needs different treatment and overrides this in `buttonOutline.ios.ts`.
 */

export type ButtonOutline = {
  /** Border values to merge into the Expo UI `style` prop, or null to omit them. */
  styleBorder: { borderColor: string; borderWidth: number } | null;
  /** SwiftUI escape-hatch modifiers, unused off iOS. */
  modifiers?: ModifierConfig[];
};

export function resolveButtonOutline(
  color: string | undefined,
  width: number,
  _radius: number,
): ButtonOutline {
  if (!color) return { styleBorder: null };
  return { styleBorder: { borderColor: color, borderWidth: width } };
}
