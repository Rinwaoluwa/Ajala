import { Image } from 'expo-image';

/**
 * The Ajala lockup — icon mark, wordmark and the "Meet fellow solo travellers
 * nearby" tagline, all baked into one SVG (`assets/icons/ajala-logo.svg`).
 *
 * Rendered through expo-image, which draws SVG natively, so no SVG runtime is
 * needed. Metro already ships `.svg` as an asset.
 *
 * The artwork's colours are fixed (teal, coral, grey) and the same file is used in
 * both schemes: the dark splash design places this exact lockup on Night. The teal
 * wordmark sits at about 3:1 on Night, which holds for a logo of this size but not
 * for small placements, so keep it large on dark surfaces.
 */

const LOGO = require('../../../../assets/icons/ajala-logo.svg');

/** The SVG's own viewBox. Its natural size is also its size on the splash design. */
const NATURAL_WIDTH = 229;
const NATURAL_HEIGHT = 101;

export type LogoProps = {
  /** Rendered width in points. Height follows the artwork's aspect ratio. */
  width?: number;
};

export function Logo({ width = NATURAL_WIDTH }: LogoProps) {
  return (
    <Image
      source={LOGO}
      style={{ width, height: (width * NATURAL_HEIGHT) / NATURAL_WIDTH }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Ajala. Meet fellow solo travellers nearby."
    />
  );
}
