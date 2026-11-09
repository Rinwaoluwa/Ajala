import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import {
  downloadOtaUpdate,
  isOtaUpdateAvailable,
  launchOtaUpdate,
  otaUpdatesEnabled,
} from '@core/updates/otaUpdates';

/** The launch screen's colour (app.json splash), so the restart blends into it. */
const LAUNCH_COLOR = '#0E6F69';
/** Back from the background after this long, look again. */
const RECHECK_AFTER_MS = 15 * 60 * 1000;
/** Long enough to read "Restarting" before the app restarts. */
const RESTART_PAUSE_MS = 700;

export type OtaPhase = 'idle' | 'downloading' | 'restarting';

/**
 * View model for over-the-air updates: looks for one at launch and when the app
 * returns after a while, and when there is one, downloads it while "Updating
 * Ajala" is on screen, then restarts the app on it.
 *
 * Checking is silent: nothing is shown unless an update is found. A failed
 * check or download goes back to the app as it was, which still works; the
 * next launch tries again. Development builds never check (Metro serves them).
 */
export function useOtaUpdate(): OtaPhase {
  const [phase, setPhase] = useState<OtaPhase>('idle');
  const running = useRef(false);
  const lastCheck = useRef(0);

  const run = useCallback(async () => {
    if (!otaUpdatesEnabled || running.current) return;
    running.current = true;
    lastCheck.current = Date.now();
    try {
      if (!(await isOtaUpdateAvailable())) return;
      setPhase('downloading');
      if (!(await downloadOtaUpdate())) {
        setPhase('idle');
        return;
      }
      setPhase('restarting');
      await new Promise((resolve) => setTimeout(resolve, RESTART_PAUSE_MS));
      await launchOtaUpdate(LAUNCH_COLOR);
      // Still here: the restart did not happen. The update is used on the next launch.
      setPhase('idle');
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void run();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active' && Date.now() - lastCheck.current > RECHECK_AFTER_MS) void run();
    });
    return () => subscription.remove();
  }, [run]);

  return phase;
}
