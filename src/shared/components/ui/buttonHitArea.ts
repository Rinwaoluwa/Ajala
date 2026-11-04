import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Modifiers for a native button's LABEL container that make the whole button
 * tappable. See `buttonHitArea.ios.ts` for why iOS needs them.
 *
 * Android and web need none: Compose's button puts its `clickable` on its whole
 * surface, around the label. What Android does need is the padding on the label
 * rather than on the button: a button's `style` padding becomes a Compose
 * `padding()` OUTSIDE that surface, a margin that does not take taps. Callers put
 * their padding on the label for both platforms.
 */
export function buttonHitArea(_options: {
  radius?: number;
  fillWidth?: boolean;
  fillHeight?: boolean;
}): ModifierConfig[] {
  return [];
}
