import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Android and web: Compose's text field grows with its text by itself; the box
 * only stops it at `max` lines' height. iOS is in `nativeComposeLines.ios.ts`.
 */
export function composeLines(
  max: number,
  lineHeight = 24,
): { modifiers: ModifierConfig[]; style?: { maxHeight: number } } {
  return { modifiers: [], style: { maxHeight: max * lineHeight } };
}
