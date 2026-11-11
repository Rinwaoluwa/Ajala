
// Architecture is enforced here, not by convention. A PR that reaches across a
// feature boundary fails lint before a human ever reviews it.
//
// Flat config: ESLint 9 no longer reads .eslintrc.* files.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

/**
 * Applies to every file. Repeated inside each layer's rule below, because a
 * file-specific `no-restricted-imports` REPLACES the general one rather than
 * merging with it — without the spread, layer files would be exempt from these.
 */
const FEATURE_BOUNDARY_PATTERNS = [
  {
    group: ['@features/*/*'],
    message:
      'Import a feature only through its public barrel: @features/<name>. ' +
      "Reaching into its internals couples your feature to someone else's refactor.",
  },
  {
    group: ['../../features/*', '../../../features/*'],
    message: 'Use the @features/<name> alias, never a relative path across features.',
  },
  {
    group: ['@expo/ui'],
    importNames: ['Host'],
    message:
      "Use Host from @shared/components: Expo UI's own applies a content-sized Host's size late, " +
      'so views sat in the wrong place until something else re-rendered.',
  },
];

const restrict = (...patterns) => [
  'error',
  { patterns: [...FEATURE_BOUNDARY_PATTERNS, ...patterns] },
];

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'ios/*', 'android/*', 'coverage/*'],
  },
  {
    // Build scripts and root config files run in Node, not the app runtime.
    files: ['scripts/**/*.js', '*.config.js'],
    languageOptions: { sourceType: 'commonjs', globals: globals.node },
  },
  {
    rules: {
      'no-restricted-imports': restrict(),
    },
  },
  {
    // The dependency rule: Presentation -> Domain <- Data. Domain imports nothing.
    files: ['src/**/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict(
        { group: ['@core/*'], message: 'Domain is framework-free. Move infrastructure access into the Data layer.' },
        { group: ['**/data/**'], message: 'Domain must not import Data. Depend on the repository interface instead.' },
        { group: ['**/presentation/**'], message: 'Domain must not import Presentation.' },
        {
          group: ['react', 'react-native', 'expo*', '@react-navigation/*', '@tanstack/*', 'axios'],
          message: 'Domain is pure TypeScript — no React, Expo, navigation or HTTP imports.',
        },
      ),
    },
  },
  {
    files: ['src/**/data/**/*.ts'],
    rules: {
      'no-restricted-imports': restrict({
        group: ['**/presentation/**'],
        message: 'Data must not import Presentation.',
      }),
    },
  },
  {
    files: ['src/**/presentation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrict({
        group: ['**/data/**'],
        message:
          "A screen or hook never touches a repository. Call a use case; the feature's " +
          'module wires the repository implementation behind it.',
      }),
    },
  },
  {
    // The one file that wraps Expo UI's Host (see src/shared/components/ui/Host.tsx).
    files: ['src/shared/components/ui/Host.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
