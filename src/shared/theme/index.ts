/**
 * Theme surface for features.
 *
 * **Default to NativeWind classes.** `bg-background`, `text-foreground`, `bg-cta`,
 * `border-border` resolve per colour scheme through the CSS variables in global.css.
 * A screen written with those classes is correct in light and dark by construction.
 *
 * This module is the escape hatch for the places a class name cannot reach —
 * chart geometry, map pin fills, status-bar style, native module options — and the
 * place role assignment is documented.
 */

import { palette } from './tokens/colors';

export type ColorScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  surface: string;
  /** Primary body text and headings. */
  foreground: string;
  /** Captions, timestamps, helper text. */
  muted: string;
  border: string;

  /** Buttons, headings, active tabs, links, verified badges. */
  primary: string;
  primaryForeground: string;
  /** The single most important action on the screen. Never an error. */
  cta: string;
  ctaForeground: string;
  /** Highlights, badges, validation-met ticks. Never body text. */
  accent: string;
  accentForeground: string;

  success: string;
  destructive: string;
};

const light: SemanticColors = {
  background: palette.paper,
  surface: palette.white,
  foreground: palette.ink,
  muted: palette.inkSecondary,
  border: palette.borderLight,

  primary: palette.teal,
  primaryForeground: palette.white,
  cta: palette.coral,
  ctaForeground: palette.white,
  accent: palette.marigold,
  accentForeground: palette.ink,

  success: palette.success,
  destructive: palette.error,
};

const dark: SemanticColors = {
  background: palette.night,
  surface: palette.deep,
  foreground: palette.mist,
  muted: palette.mistSecondary,
  border: palette.borderDark,

  // Dark mode is not the light palette dimmed. The brand brief gives distinct
  // hexes here because #0E6F69 and #CC4A30 lose their contrast on Night.
  primary: palette.tealLight,
  primaryForeground: palette.night,
  cta: palette.coralLight,
  ctaForeground: palette.night,
  // Marigold holds contrast on both schemes, so it does not flip.
  accent: palette.marigold,
  accentForeground: palette.ink,

  success: palette.successLight,
  destructive: palette.errorLight,
};

export const themes: Record<ColorScheme, SemanticColors> = { light, dark };

export const getTheme = (scheme: ColorScheme): SemanticColors => themes[scheme];

export { palette, contrast, COLOR_USAGE_RULES, type PaletteColor } from './tokens/colors';
export { spacing, layout, SCREEN_GUTTER } from './tokens/spacing';
export { radii, borderWidth, type BorderWidthToken } from './tokens/radii';
export {
  fontFamily,
  textStyles,
  fontAssets,
  type TextStyleName,
  type TextStyleToken,
} from './tokens/typography';
