import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * How an outlined (`secondary`, `neutral`) button draws its stroke.
 *
 * This is the cross-platform default, used on Android and web. Expo UI's Android
 * transform draws a rounded border by layering: clip to the outer shape, paint the
 * border colour, inset by the stroke width, clip again, then paint the background.
 * If the button has no background of its own, nothing covers the middle and the
 * whole button comes out border-coloured — a filled grey button instead of an
 * outline. So an unfilled outlined button is given the colour of the surface it sits
 * on as its inner fill (`fill`), which leaves only the ring visible.
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
};

export function resolveButtonOutline(
  color: string | undefined,
  width: number,
  _radius: number,
  surface: string,
): ButtonOutline {
  if (!color) return { styleBorder: null };
  return { styleBorder: { borderColor: color, borderWidth: width }, fill: surface };
}
