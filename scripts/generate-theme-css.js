#!/usr/bin/env node
/**
 * Generates global.css from contracts/design-tokens/design-tokens.json.
 *
 * The semantic colour roles live in CSS variables so a single Tailwind class
 * (`bg-background`) resolves correctly in both schemes. Those variables have to be
 * literal RGB triplets, which means they cannot reference the JSON at runtime — so
 * we generate them, rather than hand-maintaining a second copy of every hex.
 *
 * Run after changing the contract:  npm run tokens:css
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const tokens = require(path.join(ROOT, 'contracts/design-tokens/design-tokens.json'));

/** '#0E6F69' -> '14 111 105' */
const rgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(' ');
};

const c = tokens.color;

/** role -> hex, per scheme. The only place role assignment is decided. */
const roles = (scheme) => {
  const s = c[scheme];
  const isDark = scheme === 'dark';
  return {
    background: s.background.value,
    surface: s.surface.value,
    foreground: s.text.value,
    muted: s.textSecondary.value,
    border: s.border.value,

    primary: isDark ? s.primary.value : c.brand.teal.value,
    'primary-foreground': isDark ? s.background.value : '#FFFFFF',

    cta: isDark ? s.accent.value : c.brand.coral.value,
    'cta-foreground': isDark ? s.background.value : '#FFFFFF',

    // Marigold holds its contrast on both schemes, so it does not flip.
    accent: c.brand.marigold.value,
    'accent-foreground': c.light.text.value,

    success: isDark ? s.success.value : c.status.success.value,
    destructive: isDark ? s.error.value : c.status.error.value,
  };
};

const block = (map, indent) =>
  Object.entries(map)
    .map(([k, hex]) => `${indent}--color-${k}: ${rgb(hex)};`)
    .join('\n');

const css = `/**
 * GENERATED FILE — do not edit.
 * Source: contracts/design-tokens/design-tokens.json
 * Regenerate: npm run tokens:css
 *
 * Semantic colour roles as RGB triplets, so Tailwind's \`rgb(var(--x) / <alpha-value>)\`
 * can apply opacity. One class name per role, correct in light and dark.
 */

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
${block(roles('light'), '    ')}
  }

  .dark:root {
${block(roles('dark'), '    ')}
  }
}
`;

fs.writeFileSync(path.join(ROOT, 'global.css'), css);
console.log('global.css written from design-tokens.json');
