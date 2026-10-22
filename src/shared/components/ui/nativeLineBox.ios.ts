/**
 * iOS: a single line of Expo UI text is drawn at the font's OWN line height —
 * the requested `lineHeight` only spaces lines apart. Measured on device: a 14pt
 * Inter label asked for a 20pt line is a 17pt box.
 *
 * Inter's ascender and descender together are 1.21 of its size, and every native
 * label in the app is Inter or Plus Jakarta Sans, which share that ratio closely
 * enough at these sizes.
 */
const INTER_LINE_RATIO = 1.21;

export function nativeLineBox(fontSize: number, _lineHeight: number): number {
  return fontSize * INTER_LINE_RATIO;
}
