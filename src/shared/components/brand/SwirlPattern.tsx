import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

/**
 * The brand swirl that sits behind the splash and welcome screens.
 *
 * One image serves every surface. `assets/images/pattern/swirl.png` is an alpha
 * mask — white swirls on transparent — derived from the Figma pattern export,
 * and expo-image's `tintColor` paints it: pale grey on white, a step above Night
 * in dark mode, deep teal on the splash gradient. The Figma export itself was two
 * tones at 4% alpha, which only works on white; a mask works on anything.
 *
 * The export is 393pt wide (1x), so the @2x and @3x files are upscaled from it.
 * The swirls are soft, low-contrast shapes and hold up, but a 3x export from
 * Figma would be sharper and can replace these files directly.
 *
 * Decorative: hidden from assistive technology, and it never takes touches.
 * Fills its parent; `cover` keeps the swirls' proportions on any screen shape.
 */

const SWIRL = require('../../../../assets/images/pattern/swirl.png');

export type SwirlPatternProps = {
  color: string;
  /** Applied on top of `color`, for a pattern that should sit back further. */
  opacity?: number;
};

export function SwirlPattern({ color, opacity = 1 }: SwirlPatternProps) {
  return (
    <Image
      source={SWIRL}
      tintColor={color}
      contentFit="cover"
      style={[StyleSheet.absoluteFill, { opacity }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
}
