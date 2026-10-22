import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { apiRequest } from '@core/api/apiClient';

import { APP_CONFIG_TTL_MS, clearAppConfigCache, getAppConfig } from '../appConfig';

/**
 * `GET /app/config` is shared by sign-up (the terms version), the terms screen
 * and the update check: one request per 5-minute window, never a cached failure.
 */

jest.mock('@core/api/apiClient', () => ({ apiRequest: jest.fn() }));

const request = apiRequest as unknown as jest.Mock<() => Promise<unknown>>;

const CONFIG = {
  termsVersion: '2026-01-01',
  termsUrl: 'https://ajalatrvl.com/terms',
  privacyUrl: 'https://ajalatrvl.com/privacy',
  faqUrl: 'https://ajalatrvl.com/faq',
  supportEmail: 'support@ajalatrvl.com',
  minAppVersion: { ios: '1.0.0', android: '1.0.0' },
};

let now = 1_000_000;

beforeEach(() => {
  clearAppConfigCache();
  request.mockReset();
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getAppConfig', () => {
  it('shares one request between callers', async () => {
    request.mockResolvedValue(CONFIG);
    await Promise.all([getAppConfig(), getAppConfig()]);
    await getAppConfig();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('asks again once the 5-minute window has passed', async () => {
    request.mockResolvedValue(CONFIG);
    await getAppConfig();
    now += APP_CONFIG_TTL_MS + 1;
    await getAppConfig();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('asks again when told the remembered copy is stale', async () => {
    request.mockResolvedValueOnce(CONFIG).mockResolvedValueOnce({ ...CONFIG, termsVersion: '2026-02-01' });
    await getAppConfig();
    await expect(getAppConfig({ fresh: true })).resolves.toMatchObject({ termsVersion: '2026-02-01' });
  });

  it('does not remember a failure', async () => {
    request.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(CONFIG);
    await expect(getAppConfig()).rejects.toThrow('offline');
    await expect(getAppConfig()).resolves.toEqual(CONFIG);
  });
});
