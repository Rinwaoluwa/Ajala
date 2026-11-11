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

import { palette, schemeRoles } from './tokens/colors';

export type ColorScheme = 'light' | 'dark';

export type SemanticColors = {
  background: string;
  surface: string;
  /** Primary body text. */
  foreground: string;
  /** Captions, timestamps, helper text, field labels. */
  muted: string;
  border: string;

  /** Screen headings. Brand teal in both schemes, per the sign-up designs. */
  heading: string;
  /** Inline text links. Teal on light, Marigold on dark. */
  link: string;
  /** Outlines of text fields and social sign-up buttons. */
  controlBorder: string;
  /** Disabled button fill, OTP boxes. */
  surfaceMuted: string;
  /** Inactive step segments, unmet rule marks, OTP box outlines. */
  track: string;
  placeholder: string;
  /** Tinted badge behind a success mark. Stays light on dark, as the dark sheet draws it. */
  successSoft: string;
  /** Success sheet heading: teal on light, Mist on dark ("Email verified!"). */
  successTitle: string;
  /** Info sheet heading, mark and button. The kit's indigo — flagged to design. */
  info: string;
  infoSoft: string;
  /** Badge behind a warning mark. The warning colour itself is `accent`. */
  warningSoft: string;
  /**
   * Error sheet heading, mark and button. Not `destructive`: the design's red is
   * brighter than the brand error and the same in both schemes, and it carries a
   * white label, which `destructive` on dark (#F87171) cannot.
   */
  danger: string;
  dangerSoft: string;
  /** Ring on the OTP box the next digit goes into: teal on light, Marigold on dark. */
  focusRing: string;

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
  /** Validation and error text: the brand error red, which holds contrast on both schemes. */
  destructive: string;
  /**
   * A destructive action the person can take — Log out, Delete account, Block
   * user, Remove — as the Settings design draws them: one coral red in both
   * schemes. Not for validation text, which is `destructive`.
   */
  destructiveAction: string;

  /**
   * Fill and label of a filled primary button. Brand teal with white in BOTH
   * schemes: every dark frame (onboarding, sign-up, password reset) draws its
   * buttons in #0E6F69, not Teal Light. White on teal is 6:1, and the fill is
   * just over 3:1 against Night, which is what a control's edge needs.
   */
  primaryFill: string;
  primaryFillForeground: string;
  /** Outline of a secondary button: teal on light, Mist on dark (the welcome "Sign in"). */
  outline: string;
  /**
   * A disabled filled button. The dark designs keep the light pill rather than
   * dimming it, so this does not follow `surfaceMuted` (which is dark on Night).
   */
  disabledFill: string;
  disabledForeground: string;
  /** The swirl pattern behind the welcome screen. */
  pattern: string;
  /** Inactive pagination dots: the same pale grey in both onboarding designs. */
  indicatorInactive: string;
  /** Behind an onboarding illustration that has no background of its own. */
  illustrationBackdrop: string;

  /**
   * An unselected choice chip and its label. The pale pill with ink text in BOTH
   * schemes: the dark profile-setup frames keep the light chips on Night.
   */
  chipFill: string;
  chipForeground: string;
  /** Over the screen behind a celebration sheet: a light teal wash in both designs. */
  celebrationScrim: string;

  /** A raised card on the screen (the feed's level card, list rows): white / Deep. */
  card: string;
  /** Behind a bottom sheet or a modal: a dimming wash. */
  scrim: string;
  /** Loading placeholders: the block (an image's place) and the body under it. */
  skeleton: string;
  skeletonSurface: string;
  /** An unselected filter pill and its label (the feed's type pills). */
  pillFill: string;
  pillForeground: string;
  /** The round icon buttons in the home header (bell, chat): pale Marigold / Deep. */
  iconButtonFill: string;
  /** The floating tab bar's two halves. */
  tabBar: string;
  /**
   * The chosen tile or row (current city, picked post type): a mint fill with a
   * teal outline. Mint in both schemes — the dark frames keep the light tile.
   */
  selectedFill: string;
  selectedForeground: string;
  /** A Marigold-tinted chip: the post-type tag on a card, the picker's back button. */
  accentSoft: string;
  /**
   * A pale mint panel (the profile's "Travel details" card) and the pills on it
   * and on the profile (interests, languages).
   */
  panel: string;
  panelPill: string;
};

const light: SemanticColors = {
  ...schemeRoles.light,
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
  destructiveAction: palette.destructiveAction,

  primaryFill: palette.teal,
  primaryFillForeground: palette.white,
  outline: palette.teal,
  disabledFill: schemeRoles.light.surfaceMuted,
  disabledForeground: palette.inkSecondary,
  pattern: palette.patternLight,
  indicatorInactive: schemeRoles.light.surfaceMuted,
  illustrationBackdrop: schemeRoles.light.surfaceMuted,
  chipFill: schemeRoles.light.surfaceMuted,
  chipForeground: palette.ink,
  celebrationScrim: 'rgba(14, 111, 105, 0.5)',
  card: palette.white,
  scrim: 'rgba(13, 23, 21, 0.4)',
  skeleton: '#EEEEEE',
  skeletonSurface: '#F5F6F8',
  pillFill: schemeRoles.light.surfaceMuted,
  pillForeground: palette.inkSecondary,
  iconButtonFill: schemeRoles.light.warningSoft,
  tabBar: palette.white,
  selectedFill: '#E6FAF7',
  selectedForeground: palette.teal,
  accentSoft: '#FBE7B8',
  panel: '#F2F9F7',
  panelPill: '#E6F1EF',
};

const dark: SemanticColors = {
  ...schemeRoles.dark,
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
  destructiveAction: palette.destructiveAction,

  primaryFill: palette.teal,
  primaryFillForeground: palette.white,
  outline: palette.mist,
  disabledFill: schemeRoles.light.surfaceMuted,
  disabledForeground: palette.inkSecondary,
  // One step above Night, as in the dark welcome frame.
  pattern: palette.deep,
  indicatorInactive: schemeRoles.light.surfaceMuted,
  // The dark passport frame is flat Night behind the art.
  illustrationBackdrop: schemeRoles.dark.background,
  chipFill: schemeRoles.light.surfaceMuted,
  chipForeground: palette.ink,
  // Teal at half strength would go murky on Night; the dark frame washes the
  // screen in the same pale teal as the light one.
  celebrationScrim: 'rgba(134, 176, 172, 0.94)',
  card: palette.deep,
  scrim: 'rgba(0, 0, 0, 0.55)',
  // The dark skeleton frame draws the image block in a deep teal.
  skeleton: '#183D3A',
  skeletonSurface: palette.deep,
  pillFill: palette.deep,
  pillForeground: palette.mistSecondary,
  iconButtonFill: palette.deep,
  tabBar: '#111417',
  selectedFill: '#E6FAF7',
  selectedForeground: palette.teal,
  accentSoft: '#FBE7B8',
  panel: palette.deep,
  panelPill: '#183D3A',
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
