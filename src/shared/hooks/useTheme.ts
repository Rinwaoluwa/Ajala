import { useAppColorScheme } from '@shared/hooks/useAppColorScheme';
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
  // The app's one reading of the scheme (`useAppColorScheme`), so these colours change in
  // the same render as every class name.
  const scheme = useAppColorScheme();
  return getTheme(scheme);
}
