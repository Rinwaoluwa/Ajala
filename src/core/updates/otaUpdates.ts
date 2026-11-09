/**
 * Over-the-air updates (EAS Update). The only file that imports `expo-updates`.
 *
 * Release builds only: a development build runs the JavaScript Metro serves, and
 * expo-updates refuses to check there. `checkAutomatically` is off in
 * app.config.js, so nothing is fetched behind the app's back; the app-update
 * feature asks, and shows the person that an update is installing.
 *
 * Every call resolves rather than throwing: a failed check or download leaves
 * the person on the version they have, which still works.
 */

type UpdatesModule = typeof import('expo-updates');

/**
 * Loaded defensively: a build made before expo-updates was added has no native
 * module, and importing it there throws at load and takes the app down. Such a
 * build simply has no over-the-air updates.
 */
const Updates: UpdatesModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-updates') as UpdatesModule;
  } catch {
    return null;
  }
})();

/** Whether this build can take updates at all (a release build with expo-updates on). */
export const otaUpdatesEnabled = !__DEV__ && !!Updates?.isEnabled;

/** Whether the server has a newer update for this build's channel and native code. */
export async function isOtaUpdateAvailable(): Promise<boolean> {
  if (!otaUpdatesEnabled || !Updates) return false;
  try {
    return (await Updates.checkForUpdateAsync()).isAvailable;
  } catch {
    return false;
  }
}

/** Downloads the update. True when a new one is ready to launch. */
export async function downloadOtaUpdate(): Promise<boolean> {
  if (!otaUpdatesEnabled || !Updates) return false;
  try {
    return (await Updates.fetchUpdateAsync()).isNew;
  } catch {
    return false;
  }
}

/**
 * Restarts the app on the downloaded update. The native reload screen, in the
 * launch colour, covers the restart so nothing flashes.
 */
export async function launchOtaUpdate(backgroundColor: string): Promise<void> {
  if (!Updates) return;
  try {
    await Updates.reloadAsync({
      reloadScreenOptions: { backgroundColor, spinner: { enabled: true, color: '#FFFFFF' }, fade: true },
    });
  } catch {
    // Could not restart: the update is used on the next launch instead.
  }
}

function useModuleDownloadProgress(): number | undefined {
  return (Updates as UpdatesModule).useUpdates().downloadProgress;
}
function useNoDownloadProgress(): number | undefined {
  return undefined;
}

/**
 * The download's progress, 0–1, while one is running; undefined otherwise.
 * Chosen once at load (a build either has the module or not), so the hook is
 * the same on every render.
 */
export const useOtaDownloadProgress: () => number | undefined = Updates
  ? useModuleDownloadProgress
  : useNoDownloadProgress;
