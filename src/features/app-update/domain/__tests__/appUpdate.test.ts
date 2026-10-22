import { describe, expect, it } from '@jest/globals';

import type { AppUpdateRepository } from '../repositories/AppUpdateRepository';
import { makeCheckForRequiredUpdate } from '../usecases/CheckForRequiredUpdateUseCase';
import { compareVersions, isUpdateRequired, parseVersion } from '../rules/versionRules';

/**
 * The forced update (spec §2.1 step 2): block a build older than
 * `minAppVersion`, and nothing else — an unreadable version or a failed fetch
 * must never lock people out.
 */

describe('parseVersion', () => {
  it('reads major.minor.patch, filling in missing parts', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3]);
    expect(parseVersion('1.2')).toEqual([1, 2, 0]);
    expect(parseVersion('2')).toEqual([2, 0, 0]);
  });

  it('tolerates a leading v and a pre-release or build suffix', () => {
    expect(parseVersion('v1.4.0')).toEqual([1, 4, 0]);
    expect(parseVersion('1.4.0-beta.2')).toEqual([1, 4, 0]);
    expect(parseVersion('1.4.0+45')).toEqual([1, 4, 0]);
  });

  it('refuses anything that is not a version', () => {
    expect(parseVersion('')).toBeNull();
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('1.x.0')).toBeNull();
  });
});

describe('compareVersions', () => {
  it('compares part by part as numbers, not as text', () => {
    expect(compareVersions([1, 10, 0], [1, 9, 0])).toBeGreaterThan(0);
    expect(compareVersions([0, 1, 0], [1, 0, 0])).toBeLessThan(0);
    expect(compareVersions([1, 0, 0], [1, 0, 0])).toBe(0);
  });
});

describe('isUpdateRequired', () => {
  it('requires an update only when the installed build is older', () => {
    expect(isUpdateRequired('0.1.0', '1.0.0')).toBe(true);
    expect(isUpdateRequired('1.0.0', '1.0.0')).toBe(false);
    expect(isUpdateRequired('1.2.0', '1.0.9')).toBe(false);
  });

  it('lets people in when either side cannot be read', () => {
    expect(isUpdateRequired('unknown', '1.0.0')).toBe(false);
    expect(isUpdateRequired('0.1.0', '')).toBe(false);
  });
});

function fakeRepo(overrides: Partial<AppUpdateRepository> = {}): AppUpdateRepository {
  return {
    getMinimumVersion: async () => '1.0.0',
    getInstalledVersion: () => '0.1.0',
    getStoreUrl: () => 'https://play.google.com/store/apps/details?id=com.ajala.app',
    ...overrides,
  };
}

describe('checkForRequiredUpdate', () => {
  it('blocks an old build and says where the update is', async () => {
    await expect(makeCheckForRequiredUpdate(fakeRepo())()).resolves.toEqual({
      required: true,
      installedVersion: '0.1.0',
      minimumVersion: '1.0.0',
      storeUrl: 'https://play.google.com/store/apps/details?id=com.ajala.app',
    });
  });

  it('lets a current build in', async () => {
    const repo = fakeRepo({ getInstalledVersion: () => '1.0.0' });
    await expect(makeCheckForRequiredUpdate(repo)()).resolves.toEqual({ required: false });
  });

  it('lets people in when the config cannot be fetched', async () => {
    const repo = fakeRepo({
      getMinimumVersion: async () => {
        throw new Error('offline');
      },
    });
    await expect(makeCheckForRequiredUpdate(repo)()).resolves.toEqual({ required: false });
  });

  it('lets people in when the build or the platform minimum is unknown', async () => {
    await expect(makeCheckForRequiredUpdate(fakeRepo({ getInstalledVersion: () => null }))()).resolves.toEqual({
      required: false,
    });
    await expect(makeCheckForRequiredUpdate(fakeRepo({ getMinimumVersion: async () => null }))()).resolves.toEqual({
      required: false,
    });
  });

  it('still blocks when the store page is unknown, and says so', async () => {
    const repo = fakeRepo({ getStoreUrl: () => null });
    await expect(makeCheckForRequiredUpdate(repo)()).resolves.toMatchObject({ required: true, storeUrl: null });
  });
});
