import { useColorScheme } from 'react-native';

import { getTheme, type SemanticColors } from '@shared/theme';

/**
 * Resolved semantic colours for the active scheme, as plain JS values.
 *
 * NativeWind handles this automatically for React Native views, but Expo UI renders
 * real SwiftUI / Compose views that take concrete colour values rather than class
 * names. Those components read their colours from here, so both styling paths still
 * resolve to the same token contract.
 */
export function useTheme(): SemanticColors {
  // React Native's ColorSchemeName also allows null and 'unspecified'. Anything that
  // is not explicitly dark falls back to light, which is the designed default.
  const scheme = useColorScheme();
  return getTheme(scheme === 'dark' ? 'dark' : 'light');
}
