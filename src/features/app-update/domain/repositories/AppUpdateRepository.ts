/**
 * What the update check needs from the outside world. The data layer reads the
 * app config and the installed build; the domain only compares.
 */
export interface AppUpdateRepository {
  /**
   * The oldest version the API still supports on this platform
   * (`minAppVersion.ios` / `.android`). Null on a platform it says nothing for.
   * Rejects when the config cannot be fetched.
   */
  getMinimumVersion(): Promise<string | null>;

  /** This build's version, or null when it cannot be read. */
  getInstalledVersion(): string | null;

  /** The store page for this app on this platform, or null when unknown. */
  getStoreUrl(): string | null;
}
