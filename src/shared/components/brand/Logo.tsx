import { Image } from 'expo-image';

/**
 * The Ajala logo: the caret mark and the "ajala" wordmark.
 *
 * Two colourways, each its own SVG, because expo-image draws an SVG as it is and
 * cannot recolour parts of it:
 *   - `brand`   — teal with coral dots (`assets/icons/ajala-wordmark.svg`), on
 *     white and on Night. The teal sits at about 3:1 on Night, which holds for a
 *     logo this size but not for small placements, so keep it large on dark.
 *   - `inverse` — white with marigold dots (`ajala-wordmark-inverse.svg`), for the
 *     teal splash gradient.
 *
 * The tagline is not part of the artwork. The design changed it to "Meet fellow
 * travellers nearby." and it is set as text where it appears, so it can follow
 * the text-size setting and a copy change is not an asset change.
 *
 * Rendered through expo-image, which draws SVG natively, so no SVG runtime is
 * needed. Metro already ships `.svg` as an asset.
 */

const SOURCES = {
  brand: require('../../../../assets/icons/ajala-wordmark.svg'),
  inverse: require('../../../../assets/icons/ajala-wordmark-inverse.svg'),
} as const;

/** The SVGs' own viewBox: the full width of the lockup in Figma, without its tagline. */
const NATURAL_WIDTH = 229;
const NATURAL_HEIGHT = 82;

export type LogoTone = keyof typeof SOURCES;

export type LogoProps = {
  /** Rendered width in points. Height follows the artwork's aspect ratio. */
  width?: number;
  tone?: LogoTone;
};

export function Logo({ width = NATURAL_WIDTH, tone = 'brand' }: LogoProps) {
  return (
    <Image
      source={SOURCES[tone]}
      style={{ width, height: logoHeight(width) }}
      contentFit="contain"
      accessibilityRole="image"
      accessibilityLabel="Ajala"
    />
  );
}

/** The height the logo takes at a given width, for laying things out around it. */
export const logoHeight = (width: number) => (width * NATURAL_HEIGHT) / NATURAL_WIDTH;
