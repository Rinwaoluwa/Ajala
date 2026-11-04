import { contentShape, frame, shapes, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: make the whole button tappable, not just its text.
 *
 * `variant="text"` maps to SwiftUI's `.plain` button style, which only takes taps
 * on its LABEL — the view passed as the button's child. Anything Expo UI adds from
 * the button's own `style` (padding, frame, background) wraps the button from the
 * outside, so it is drawn but is not part of the label, and a tap on it does
 * nothing. A full-width "Sign In" was tappable only on its few letters: the "I have
 * to press it three or four times" bug. A `.contentShape()` on the button from the
 * outside does not help either: the button's tap is decided inside, on the label.
 *
 * So these modifiers go on the LABEL container (the Row inside the button), after
 * its padding:
 *   - `fillWidth` / `fillHeight` stretch the label to the frame the button was
 *     given, so a full-width button's label is full width too (centred);
 *   - `contentShape` makes the label's empty space — the padding, a `Spacer` —
 *     hit-test, in the button's own shape so the corners outside a pill stay out.
 */
export function buttonHitArea({
  radius = 0,
  fillWidth = false,
  fillHeight = false,
}: {
  radius?: number;
  fillWidth?: boolean;
  fillHeight?: boolean;
}): ModifierConfig[] {
  const fill =
    fillWidth || fillHeight
      ? [
          frame({
            maxWidth: fillWidth ? Infinity : undefined,
            maxHeight: fillHeight ? Infinity : undefined,
          }),
        ]
      : [];
  return [...fill, contentShape(shapes.roundedRectangle({ cornerRadius: radius }))];
}
