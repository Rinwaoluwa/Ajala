/**
 * NativeWind / Tailwind configuration.
 *
 * Every value here is READ from contracts/design-tokens/design-tokens.json, which is
 * the single source of truth shared with design. Do not type a hex or a pixel value
 * into this file — change the contract and both this config and the TypeScript token
 * modules pick it up.
 *
 * Colours are exposed as SEMANTIC names only (bg-background, text-destructive,
 * bg-cta). Raw brand names like `teal` are deliberately not exported: a component
 * that says `bg-teal` is wrong in dark mode, where the primary is #2BB3A3.
 */

const t = require('./contracts/design-tokens/design-tokens.json');

/** `[0, 2, 4, …]` → `{ 0: '0px', 2: '2px', … }` */
const pxScale = (scale) =>
  Object.fromEntries(scale.map((n) => [String(n), `${n}px`]));

/** One entry per type step: `['32px', { lineHeight: '40px' }]`. */
const fontSize = Object.fromEntries(
  Object.entries(t.typography.scale).map(([name, s]) => [
    name,
    [`${s.size}px`, { lineHeight: `${s.lineHeight}px` }],
  ]),
);

const c = t.color;

module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],

  // Driven by the OS setting via NativeWind's colorScheme, not a manual class.
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // Semantic roles. Each resolves per scheme through the CSS variables
        // defined in global.css — one class name, correct in both themes.
        background: 'rgb(var(--color-background) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        foreground: 'rgb(var(--color-foreground) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',

        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          foreground: 'rgb(var(--color-primary-foreground) / <alpha-value>)',
        },
        /** The one important action per screen. Never used for errors. */
        cta: {
          DEFAULT: 'rgb(var(--color-cta) / <alpha-value>)',
          foreground: 'rgb(var(--color-cta-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          foreground: 'rgb(var(--color-accent-foreground) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--color-success) / <alpha-value>)',
          soft: 'rgb(var(--color-success-soft) / <alpha-value>)',
        },
        destructive: 'rgb(var(--color-destructive) / <alpha-value>)',

        /** Screen headings. Brand teal in both schemes, per the sign-up designs. */
        heading: 'rgb(var(--color-heading) / <alpha-value>)',
        /** Inline links. Teal on light, Marigold on dark. */
        link: 'rgb(var(--color-link) / <alpha-value>)',
        /** Outlines of fields and social buttons. */
        'control-border': 'rgb(var(--color-control-border) / <alpha-value>)',
        /** Disabled button fill, OTP boxes. */
        'surface-muted': 'rgb(var(--color-surface-muted) / <alpha-value>)',
        /** Inactive step segments, unmet rule marks. */
        track: 'rgb(var(--color-track) / <alpha-value>)',
        placeholder: 'rgb(var(--color-placeholder) / <alpha-value>)',
      },

      fontFamily: {
        heading: ['PlusJakartaSans-SemiBold'],
        'heading-bold': ['PlusJakartaSans-Bold'],
        'heading-extrabold': ['PlusJakartaSans-ExtraBold'],
        body: ['Inter-Regular'],
        'body-medium': ['Inter-Medium'],
        'body-semibold': ['Inter-SemiBold'],
        display: ['Fraunces-SemiBold'],
        'display-italic': ['Fraunces-SemiBoldItalic'],
      },

      fontSize,
      spacing: pxScale(t.spacing.scale),
      borderRadius: { ...pxScale(t.radius.scale), full: '9999px' },
      borderWidth: pxScale(t.borderWidth.scale),

      // Control heights are not on the spacing scale — 36/44/50 are the measured
      // Button sizes, and they would otherwise have to be hard-coded in the component.
      height: {
        ...pxScale(t.spacing.scale),
        ...pxScale(Object.values(t.layout.button.height)),
      },
    },
  },

  plugins: [],
};

// Exported for the token modules and for tests that assert config/contract parity.
module.exports.__tokens = { contrast: c, layout: t.layout };
