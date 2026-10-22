import { useWindowDimensions } from 'react-native';

/**
 * How far text may grow with the person's text-size setting (iOS Dynamic Type,
 * Android font size), and how much it has grown right now.
 *
 * Text follows the setting; layout has to make room for it. Two ceilings keep
 * that possible on a phone:
 *
 *   - Body and label text stop at 2× — iOS's "AX2" and Android's own 200%
 *     maximum — which is past every non-accessibility size.
 *   - Headings stop at 1.3×. They start at up to 32pt; at 2× a single word like
 *     "Verification" no longer fits the width and breaks mid-word. Apple's own
 *     large titles scale less than body text for the same reason.
 *
 * Shrinking is allowed: below 1× text follows the setting, but containers keep
 * their designed size (see `useFontScale`), so nothing gets cramped.
 */
export const MAX_TEXT_SCALE = 2;
export const MAX_HEADING_SCALE = 1.3;
/**
 * Native text links stop a step earlier (iOS `accessibility1`, see
 * `nativeTextScaleCap('link')`); text that stands in for a link uses this so the
 * two are the same size.
 */
export const MAX_LINK_SCALE = 1.65;

/**
 * The current growth factor for sizing containers around text: 1 at the
 * default size, up to `MAX_TEXT_SCALE`. Never below 1 — a smaller text setting
 * keeps the designed box sizes rather than shrinking tap targets.
 */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  return Math.min(Math.max(fontScale, 1), MAX_TEXT_SCALE);
}
