/**
 * Text for the forced-update screen. NOT IN FIGMA: the screen-to-API map asks
 * for "a force-update screen when the build is older than minAppVersion" and no
 * frame exists yet, so this is written in the auth screens' voice — sentence
 * case, plain words — to be replaced when design draws it.
 */
export const forceUpdateCopy = {
  title: 'Time to update',
  body: 'This version of Ajala is no longer supported. Update to the latest version to keep exploring.',
  versions: (installed: string, minimum: string) =>
    `You have version ${installed}. Version ${minimum} or later is needed.`,
  update: 'Update Ajala',
  /** When the store page is not known (iOS before the App Store id is set). */
  noStoreLink: 'Open the App Store or Google Play and update Ajala from there.',
  storeFailed: "We couldn't open the store. Open it yourself and search for Ajala.",
  /** Development builds only: dev versions run behind whatever the API asks for. */
  devBypass: 'Continue anyway (development build)',
} as const;

/**
 * Text for the screen shown while an over-the-air update installs. NOT IN
 * FIGMA: written in the same voice as the forced-update screen, to be replaced
 * when design draws it.
 */
export const otaUpdateCopy = {
  title: 'Updating Ajala',
  body: "We're installing the latest improvements. This only takes a moment.",
  downloading: (percent: number | null) => (percent === null ? 'Downloading…' : `Downloading… ${percent}%`),
  restarting: 'Restarting Ajala…',
} as const;
