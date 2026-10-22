import { getAppConfig } from '@core/config/appConfig';
import { getAppPlatform, getInstalledAppVersion, getStoreUrl } from '@core/config/appVersion';

import type { AppUpdateRepository } from '../../domain/repositories/AppUpdateRepository';

/**
 * `minAppVersion` from `GET /app/config`, and this build's own version.
 *
 * Cache policy: the shared app-config cache (`core/config/appConfig`, 5 minutes,
 * as the screen-to-API map allows). The same answer also carries the terms
 * version, so the auth feature and this one share one request per window rather
 * than each fetching their own.
 */
export const createAppUpdateRepository = (): AppUpdateRepository => ({
  async getMinimumVersion() {
    const platform = getAppPlatform();
    if (!platform) return null;
    const { minAppVersion } = await getAppConfig();
    const minimum = minAppVersion?.[platform];
    return typeof minimum === 'string' && minimum.trim() !== '' ? minimum : null;
  },

  getInstalledVersion: getInstalledAppVersion,

  getStoreUrl,
});
