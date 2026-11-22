import { useColorScheme } from 'nativewind';

/**
 * The colour scheme the app is drawn in right now: `light` or `dark`.
 *
 * Use this, not React Native's `useColorScheme`. Both follow the same thing
 * (the phone's setting, or the theme chosen in Settings › Appearance), but they
 * tell React about a change in different ways. React Native's hook insists on
 * an immediate render of its own; every `className` in the app (NativeWind)
 * re-renders in a second, ordinary one. With both in play a theme switch drew
 * the screen twice, back to back (measured 22 Nov: two passes of about 210ms
 * each in development), and the first pass could not be interrupted.
 *
 * This reads NativeWind's own value, so everything that depends on the scheme
 * (class names, `useTheme` colours, native views given a colour) changes
 * together, once.
 */
export function useAppColorScheme(): 'light' | 'dark' {
  return useColorScheme().colorScheme === 'dark' ? 'dark' : 'light';
}
