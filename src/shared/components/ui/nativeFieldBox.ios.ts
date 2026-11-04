import { frame, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: the box a multi-line SwiftUI `TextField` fills, with its text pinned to
 * the top-left. Given only a height (`style={{ height }}`), SwiftUI centres the
 * lines vertically in it, so a short description sat a third of the way down
 * the box. `style` is left off on iOS; this frame replaces it.
 */
export function multilineFieldBox(height: number): { modifiers: ModifierConfig[]; style?: undefined } {
  return { modifiers: [frame({ maxWidth: Infinity, height, alignment: 'topLeading' })] };
}
