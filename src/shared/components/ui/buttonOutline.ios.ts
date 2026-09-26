import { strokeBorder } from '@expo/ui/swift-ui/modifiers';

import type { ButtonOutline } from './buttonOutline';

/**
 * iOS stroke for an outlined (`secondary`) button.
 *
 * WHY NOT `style.borderWidth` HERE: Expo UI maps that to SwiftUI's
 * `.border(_:width:)`, which draws a **rectangular** stroke, and the `borderRadius`
 * from the same style becomes a `.clipShape(...)` applied afterwards. The clip then
 * cuts the rectangle down to the pill — leaving the flat top and bottom edges intact
 * as two straight lines and shaving the vertical sides away to a pair of stubs. That
 * is the "chopped edges" look.
 *
 * `strokeBorder` instead strokes an **inset** border along the view's own shape, so
 * a capsule stroke stays a capsule and nothing is clipped. The style-derived border
 * is omitted entirely, because a `border` and a `strokeBorder` are different
 * modifier types and would otherwise both be drawn.
 *
 * `roundedRectangle` with the same radius the button uses is preferred over
 * `capsule`, so a non-pill size (should one ever exist) still matches its fill.
 */
export function resolveButtonOutline(
  color: string | undefined,
  width: number,
  radius: number,
  // A true stroke leaves the middle transparent, so the surface is not needed here.
  _surface: string,
): ButtonOutline {
  if (!color) return { styleBorder: null };

  return {
    styleBorder: null,
    modifiers: [
      strokeBorder({
        content: color,
        style: { lineWidth: width },
        shape: 'roundedRectangle',
        cornerRadius: radius,
      }),
    ],
  };
}
