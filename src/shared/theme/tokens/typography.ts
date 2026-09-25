/**
 * Typography, derived from the token contract.
 *
 * Fonts were confirmed against the real screens on the Figma Mobile page, not just
 * the brand brief: `Heading/XXL_SemiBold` is Plus Jakarta Sans 600 32/40, and
 * `Body/Medium` is Inter 400 16/24.
 *
 * Prefer NativeWind classes — `font-heading text-headingXxl` — which come from the
 * same contract via tailwind.config.js. Use `textStyles` where a class cannot
 * reach, such as a chart label or a native header option.
 */

import tokens from '../../../../contracts/design-tokens/design-tokens.json';

/** Keys registered with expo-font. */
export const fontFamily = {
  heading: {
    semibold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    extrabold: 'PlusJakartaSans-ExtraBold',
  },
  body: {
    regular: 'Inter-Regular',
    medium: 'Inter-Medium',
    semibold: 'Inter-SemiBold',
  },
  display: {
    semibold: 'Fraunces-SemiBold',
    semiboldItalic: 'Fraunces-SemiBoldItalic',
  },
} as const;

const familyFor = (family: string, weight: number): string => {
  if (family === 'display') return fontFamily.display.semibold;
  if (family === 'heading') {
    if (weight >= 800) return fontFamily.heading.extrabold;
    if (weight >= 700) return fontFamily.heading.bold;
    return fontFamily.heading.semibold;
  }
  if (weight >= 600) return fontFamily.body.semibold;
  if (weight >= 500) return fontFamily.body.medium;
  return fontFamily.body.regular;
};

export type TextStyleToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

/** One entry per step in the contract's type scale. */
export const textStyles = Object.fromEntries(
  Object.entries(tokens.typography.scale).map(([name, s]) => [
    name,
    {
      fontFamily: familyFor(s.family, s.weight),
      fontSize: s.size,
      lineHeight: s.lineHeight,
    },
  ]),
) as Record<keyof typeof tokens.typography.scale, TextStyleToken>;

export type TextStyleName = keyof typeof textStyles;

/**
 * Handed to `useFonts()` at the app root. Mount providers outside this gate so the
 * tree renders while the files resolve.
 */
export const fontAssets = {
  'PlusJakartaSans-SemiBold': require('../../../../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
  'PlusJakartaSans-Bold': require('../../../../assets/fonts/PlusJakartaSans-Bold.ttf'),
  'PlusJakartaSans-ExtraBold': require('../../../../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  'Inter-Regular': require('../../../../assets/fonts/Inter-Regular.ttf'),
  'Inter-Medium': require('../../../../assets/fonts/Inter-Medium.ttf'),
  'Inter-SemiBold': require('../../../../assets/fonts/Inter-SemiBold.ttf'),
  'Fraunces-SemiBold': require('../../../../assets/fonts/Fraunces-SemiBold.ttf'),
  'Fraunces-SemiBoldItalic': require('../../../../assets/fonts/Fraunces-SemiBoldItalic.ttf'),
};
