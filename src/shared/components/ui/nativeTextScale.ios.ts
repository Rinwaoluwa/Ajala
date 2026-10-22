import { dynamicTypeSize, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: caps how far SwiftUI text inside a Host grows with Dynamic Type.
 *
 * Expo UI draws custom fonts with `Font.custom(_:size:)`, which scales with the
 * body text style, so native text already follows the setting. Left uncapped it
 * reaches 3× at AX5 while the React Native layout around it stops at
 * `MAX_TEXT_SCALE`; `accessibility2` is the matching 2× ceiling.
 *
 * `link` stops a step earlier: a text link hugs its label on one line and cannot
 * wrap, so it has to stay narrower than the screen.
 */
export function nativeTextScaleCap(ceiling: 'text' | 'link' = 'text'): ModifierConfig[] {
  return [dynamicTypeSize({ max: ceiling === 'link' ? 'accessibility1' : 'accessibility2' })];
}
