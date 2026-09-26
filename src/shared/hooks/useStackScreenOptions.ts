import { useMemo } from 'react';

import { useTheme } from './useTheme';

/**
 * Screen options for every Stack in the app.
 *
 * React Navigation paints each screen's container white unless told otherwise.
 * In dark mode that white shows through during a push or a swipe back, so every
 * Stack sets it to the themed background.
 */
export function useStackScreenOptions() {
  const theme = useTheme();
  return useMemo(
    () => ({ headerShown: false, contentStyle: { backgroundColor: theme.background } }),
    [theme.background],
  );
}
