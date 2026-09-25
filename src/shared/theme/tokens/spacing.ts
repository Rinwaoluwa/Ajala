/**
 * Spacing and screen layout, derived from the token contract.
 *
 * Prefer NativeWind classes (`p-16`, `gap-10`) — the Tailwind scale is generated
 * from the same source. Use these constants only where a class cannot reach:
 * `contentContainerStyle`, animation offsets, imperative measurements.
 */

import tokens from '../../../../contracts/design-tokens/design-tokens.json';

export const spacing = Object.fromEntries(
  tokens.spacing.scale.map((n) => [String(n), n]),
) as Record<string, number>;

/**
 * Measured on the Create Account screen (iPhone 14 & 15 Pro, 393pt):
 * 353pt of content between 20pt gutters.
 */
export const layout = tokens.layout;

export const SCREEN_GUTTER = tokens.layout.screenGutter;
