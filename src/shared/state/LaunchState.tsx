import { createContext, useContext, type ReactNode } from 'react';

/**
 * Whether the launch splash has handed over to the first screen.
 *
 * The first screen mounts and paints underneath the splash, seconds before anyone
 * can see it, so a mount-time entrance animation would play out unseen. A screen
 * with an entrance (the welcome screen's buttons) waits for this instead.
 *
 * The root layout provides it. Outside a provider it reads true: a screen that
 * is not first in line was never hidden.
 */

const LaunchStateContext = createContext(true);

export function LaunchStateProvider({ handedOff, children }: { handedOff: boolean; children: ReactNode }) {
  return <LaunchStateContext.Provider value={handedOff}>{children}</LaunchStateContext.Provider>;
}

export const useLaunchHandedOff = () => useContext(LaunchStateContext);
