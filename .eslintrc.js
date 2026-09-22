// Architecture is enforced here, not by convention. A PR that reaches across a
// feature boundary fails lint before a human ever reviews it.
const path = require('path');

module.exports = {
  root: true,
  extends: ['expo', 'plugin:import/recommended'],
  settings: {
    'import/resolver': { typescript: { project: path.join(__dirname, 'tsconfig.json') } },
  },
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@features/*/*'],
          message:
            'Import a feature only through its public barrel: @features/<name>. ' +
            'Reaching into its internals couples your feature to someone else\'s refactor.',
        },
        {
          group: ['../../features/*', '../../../features/*'],
          message: 'Use the @features/<name> alias, never a relative path across features.',
        },
      ],
    }],
  },
  overrides: [
    {
      // The dependency rule: Presentation -> Domain <- Data. Domain imports nothing.
      files: ['src/**/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [
            { group: ['@core/*'], message: 'Domain is framework-free. Move infrastructure access into the Data layer.' },
            { group: ['**/data/**'], message: 'Domain must not import Data. Depend on the repository interface instead.' },
            { group: ['**/presentation/**'], message: 'Domain must not import Presentation.' },
            { group: ['react', 'react-native', 'expo*', '@react-navigation/*', '@tanstack/*', 'axios'],
              message: 'Domain is pure TypeScript — no React, Expo, navigation or HTTP imports.' },
          ],
        }],
      },
    },
    {
      files: ['src/**/data/**/*.ts'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{ group: ['**/presentation/**'], message: 'Data must not import Presentation.' }],
        }],
      },
    },
    {
      files: ['src/**/presentation/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': ['error', {
          patterns: [{
            group: ['**/data/**'],
            message:
              'A screen or hook never touches a repository. Call a use case; the DI container ' +
              'wires the repository implementation behind it.',
          }],
        }],
      },
    },
  ],
};
