import { frame, lineLimit, type ModifierConfig } from '@expo/ui/swift-ui/modifiers';

/**
 * iOS: a compose box's text starts as one line and grows with what is typed, to
 * `max` lines; past that it scrolls inside the box. It takes the box's width,
 * its text starting at the top left.
 */
export function composeLines(max: number): { modifiers: ModifierConfig[]; style?: undefined } {
  return { modifiers: [lineLimit({ min: 1, max }), frame({ maxWidth: Infinity, alignment: 'topLeading' })] };
}
