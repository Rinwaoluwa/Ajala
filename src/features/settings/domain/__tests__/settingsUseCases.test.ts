import { describe, expect, it } from '@jest/globals';

import type { Account } from '../entities/Settings';
import type { SettingsRepository } from '../repositories/SettingsRepository';
import {
  makeChangePassword,
  makeCheckHandle,
  makeConfirmEmailChange,
  makeSaveProfile,
} from '../usecases/SettingsUseCases';

const account = {
  firstName: 'Maya',
  lastName: 'Chen',
  handle: 'maya',
  bio: null,
  homeCity: null,
  languages: [],
  socialLinks: { instagram: null, tiktok: null, website: null },
} as unknown as Account;

function repo(calls: string[]): SettingsRepository {
  return new Proxy({} as SettingsRepository, {
    get:
      (_t, name: string) =>
      async (...args: unknown[]) => {
        calls.push(`${name}:${JSON.stringify(args[0])}`);
        return name === 'updateAccount' ? account : { available: true, reason: null };
      },
  });
}

describe('settings use cases', () => {
  it('does not call the API when nothing changed', async () => {
    const calls: string[] = [];
    expect(await makeSaveProfile(repo(calls))(account, { firstName: 'Maya', lastName: 'Chen' })).toBe(
      account,
    );
    expect(calls).toEqual([]);
  });

  it('sends a normalised handle', async () => {
    const calls: string[] = [];
    await makeSaveProfile(repo(calls))(account, { handle: '@maya.w' });
    expect(calls).toEqual(['updateAccount:{"handle":"maya.w"}']);
  });

  it('answers a badly formed handle without asking the server', async () => {
    const calls: string[] = [];
    expect(await makeCheckHandle(repo(calls))('a!')).toEqual({ available: false, reason: 'format' });
    expect(calls).toEqual([]);
  });

  it('refuses a weak password and a short code before a request', async () => {
    const calls: string[] = [];
    await expect(makeChangePassword(repo(calls))('old', 'weak')).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    await expect(makeConfirmEmailChange(repo(calls))('12')).rejects.toMatchObject({ code: 'badCode' });
    expect(calls).toEqual([]);
  });
});
