import { contentShape, shapes, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: make the whole button tappable, not just its label.
 *
 * `variant="text"` maps to SwiftUI's `.plain` button style, whose hit area is its
 * CONTENT. The pill the user sees is a `.background()` applied around that content,
 * and a background does not take touches. So a wide button with a short label —
 * "Sign In" across the full screen width — was only tappable on the few characters
 * in the middle, and a tap anywhere else did nothing. That is the "I have to press
 * it three or four times" bug.
 *
 * `.contentShape()` declares the shape that hit-testing uses. Expo UI's own
 * `ListItem` does the same thing for the same reason. It is passed through the
 * `modifiers` prop, which Expo UI applies last — after the frame and background —
 * so the shape covers the whole button rather than just the label.
 *
 * The shape follows the button's own corner radius, so the corners outside the
 * pill stay untappable and the touch target matches what is drawn.
 */
export function buttonHitArea(radius: number): ModifierConfig[] {
  return [contentShape(shapes.roundedRectangle({ cornerRadius: radius }))];
}
