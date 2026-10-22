/**
 * The height Expo UI actually draws one line of text at, in points.
 *
 * Android: Compose draws `lineHeight` exactly. iOS is in `nativeLineBox.ios.ts`.
 *
 * Anything sized by padding around a native label (the Button) uses this, so it
 * comes out at the designed height on both platforms.
 */
export function nativeLineBox(_fontSize: number, lineHeight: number): number {
  return lineHeight;
}
