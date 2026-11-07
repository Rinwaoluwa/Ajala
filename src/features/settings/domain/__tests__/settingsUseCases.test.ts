import { describe, expect, it } from '@jest/globals';

import type { Account } from '../entities/Settings';
import type { SettingsRepository } from '../repositories/SettingsRepository';
import {
  makeChangePassword,
  makeCheckHandle,
  makeConfirmEmailChange,
  makeReauthenticate,
  makeSaveProfile,
  makeSetPassword,
} from '../usecases/SettingsUseCases';

const account = {
  firstName: 'Maya',
  lastName: 'Chen',
  handle: 'maya',
  bio: null,
  homeCity: null,
  languages: [],
  socialLinks: { instagram: null, tiktok: null, website: null },
  travelStyles: [],
  favouriteCities: [],
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

  it('checks a re-auth code and a new password before a request', async () => {
    const calls: string[] = [];
    await expect(makeReauthenticate(repo(calls))({ code: '12a' })).rejects.toMatchObject({ code: 'badCode' });
    await expect(makeReauthenticate(repo(calls))({ password: '' })).rejects.toMatchObject({
      code: 'wrongPassword',
    });
    await expect(makeSetPassword(repo(calls))('short')).rejects.toMatchObject({ code: 'invalidDetails' });
    expect(calls).toEqual([]);
    await makeReauthenticate(repo(calls))({ code: '123456' });
    expect(calls).toEqual(['reauthenticate:{"code":"123456"}']);
  });

  it('refuses more than ten travel styles or favourite cities', async () => {
    const calls: string[] = [];
    const eleven = Array.from({ length: 11 }, (_, i) => `c${i}`);
    await expect(makeSaveProfile(repo(calls))(account, { favouriteCityIds: eleven })).rejects.toMatchObject({
      code: 'invalidDetails',
    });
    expect(calls).toEqual([]);
  });
});
