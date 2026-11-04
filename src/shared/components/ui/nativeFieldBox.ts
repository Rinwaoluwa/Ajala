import type { ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * Android and web: Compose's text field already starts at the top, so the box
 * is only a height. iOS is in `nativeFieldBox.ios.ts`.
 */
export function multilineFieldBox(height: number): {
  modifiers: ModifierConfig[];
  style?: { height: number };
} {
  return { modifiers: [], style: { height } };
}
