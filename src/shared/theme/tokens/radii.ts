import tokens from '../../../../contracts/design-tokens/design-tokens.json';

/**
 * Corner radii and border widths, derived from the token contract.
 *
 * The primary button measured 8px (`Corner_Radius/8` in Figma), not a pill — worth
 * knowing before anyone reaches for a fully rounded CTA.
 *
 * Typed explicitly: spreading a `Record<string, number>` into an object literal drops
 * the index signature, which silently breaks `radii['8']` at the call site.
 */
export const radii: Record<string, number> & { full: number } = {
  ...Object.fromEntries(tokens.radius.scale.map((n) => [String(n), n])),
  full: tokens.radius.full,
};

export const borderWidth = {
  hairline: 0.5,
  thin: 1,
  thick: 2,
  heavy: 4,
} as const;

export type BorderWidthToken = keyof typeof borderWidth;
