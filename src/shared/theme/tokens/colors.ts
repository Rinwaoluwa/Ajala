/**
 * Colour primitives, derived from the token contract.
 *
 * Features do NOT import this file. They use NativeWind semantic classes
 * (`bg-background`, `text-primary`, `bg-cta`) which resolve per scheme. This module
 * exists for the places a class name cannot reach: chart geometry, map pin fills,
 * status-bar style, native module options.
 *
 * The contract is the single source of truth — tailwind.config.js and global.css
 * read the same file.
 */

import tokens from '../../../../contracts/design-tokens/design-tokens.json';

const c = tokens.color;

export const palette = {
  teal: c.brand.teal.value,
  marigold: c.brand.marigold.value,
  coral: c.brand.coral.value,

  success: c.status.success.value,
  error: c.status.error.value,

  paper: c.light.paper.value,
  white: c.light.surface.value,
  ink: c.light.text.value,
  inkSecondary: c.light.textSecondary.value,
  borderLight: c.light.border.value,

  night: c.dark.background.value,
  deep: c.dark.surface.value,
  mist: c.dark.text.value,
  mistSecondary: c.dark.textSecondary.value,
  borderDark: c.dark.border.value,

  tealLight: c.dark.primary.value,
  coralLight: c.dark.accent.value,
  errorLight: c.dark.error.value,
  successLight: c.dark.success.value,
} as const;

export type PaletteColor = keyof typeof palette;

/**
 * Roles measured on the sign-up screens. They are defined per scheme in the
 * contract rather than as brand primitives, because their dark values are not
 * a simple flip of a light one (the link, for one, changes hue).
 */
const controlRoles = (s: typeof c.light | typeof c.dark) => ({
  heading: s.heading.value,
  link: s.link.value,
  controlBorder: s.controlBorder.value,
  surfaceMuted: s.surfaceMuted.value,
  track: s.track.value,
  placeholder: s.placeholder.value,
  successSoft: s.successSoft.value,
});

export const schemeRoles = {
  light: { background: c.light.background.value, ...controlRoles(c.light) },
  dark: { background: c.dark.background.value, ...controlRoles(c.dark) },
} as const;

/**
 * Contrast ratios measured in the brand brief. If a hex changes in the contract,
 * the ratio must be re-measured — carrying the old number forward hides a
 * regression that no test will catch.
 */
export const contrast = {
  whiteOnTeal: c.brand.teal.contrast,
  inkOnMarigold: c.brand.marigold.contrast,
  whiteOnCoral: c.brand.coral.contrast,
  whiteOnSuccess: c.status.success.contrast,
  whiteOnError: c.status.error.contrast,
  inkOnWhite: c.light.text.contrastOnBackground,
  inkSecondaryOnWhite: c.light.textSecondary.contrastOnBackground,
  mistOnNight: c.dark.text.contrastOnBackground,
  mistSecondaryOnNight: c.dark.textSecondary.contrastOnBackground,
  nightOnTealLight: c.dark.primary.contrast,
  nightOnCoralLight: c.dark.accent.contrast,
} as const;

/** From the brand brief. Not enforceable in code — enforced in design review. */
export const COLOR_USAGE_RULES = c.usageRules;
