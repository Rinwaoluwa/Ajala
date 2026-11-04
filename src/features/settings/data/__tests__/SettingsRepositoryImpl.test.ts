import { describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { SettingsError } from '../../domain/entities/SettingsError';
import type { Account } from '../../domain/entities/Settings';
import { createSettingsRepository } from '../repositories/SettingsRepositoryImpl';

jest.mock('@core/config/appConfig', () => ({
  getAppConfig: async () => ({
    termsVersion: '1',
    termsUrl: 'https://t',
    privacyUrl: 'https://p',
    faqUrl: 'https://f',
    supportEmail: 'help@ajala',
    minAppVersion: { ios: '0', android: '0' },
  }),
}));

type Call = { method: string; path: string; body?: unknown };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createSettingsRepository(request), calls };
}

const ME = {
  id: 'me',
  firstName: 'Maya',
  lastName: 'Chen',
  handle: 'mayawanders',
  email: 'maya@example.com',
  bio: null,
  avatarUrl: null,
  homeCity: { id: 'london', name: 'London', countryCode: 'GB', label: 'London, UK' },
  extras: { languages: ['en'], pronouns: 'she/her' },
  identities: [{ provider: 'google', verifiedAt: '2026-01-01T00:00:00Z' }],
};

const api = (code: ApiError['code'], status: number, details?: Record<string, unknown>) =>
  new ApiError({ code, message: code, status, details });

describe('SettingsRepository over the API', () => {
  it('reads the account into Settings’ shape', async () => {
    const { repo, calls } = fake(() => ME);
    const account = await repo.getAccount();
    expect(calls[0]).toMatchObject({ method: 'GET', path: '/api/v1/me' });
    expect(account).toMatchObject({
      firstName: 'Maya',
      homeCity: { id: 'london', label: 'London, UK' },
      languages: ['en'],
      socialLinks: { instagram: null, tiktok: null, website: null },
      identities: [{ provider: 'google' }],
    });
  });

  it('merges a languages change into the extras it already has', async () => {
    const { repo, calls } = fake(() => ME);
    const current = (await repo.getAccount()) as Account;
    await repo.updateAccount({ languages: ['en', 'fr'] }, current);
    expect(calls[1]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/me',
      body: { extras: { languages: ['en', 'fr'], pronouns: 'she/her' } },
    });
  });

  it('reads a 401 as the person’s password or code, not the session', async () => {
    const wrong = fake(() => api('UNAUTHORIZED', 401)).repo;
    await expect(wrong.changePassword('x', 'Travel2026')).rejects.toMatchObject({ code: 'wrongPassword' });
    await expect(wrong.confirmEmailChange('123456')).rejects.toMatchObject({ code: 'badCode' });
    // Auth's wrapper turns a second 401 into its own "session expired".
    const wrapped = fake(() => Object.assign(new Error('x'), { code: 'sessionExpired' })).repo;
    await expect(wrapped.reauthenticate('x')).rejects.toMatchObject({ code: 'wrongPassword' });
    await expect(wrapped.getSettings()).rejects.toMatchObject({ code: 'sessionExpired' });
  });

  it('maps conflicts by what was asked', async () => {
    const conflict = fake(() => api('CONFLICT', 409)).repo;
    await expect(conflict.updateAccount({ handle: 'taken' }, {} as Account)).rejects.toMatchObject({
      code: 'handleTaken',
    });
    await expect(conflict.startEmailChange('a@b.co')).rejects.toMatchObject({ code: 'emailTaken' });
    await expect(conflict.deleteDraft('d1')).rejects.toMatchObject({ code: 'hasAttendees' });
    const cooldown = fake(() => api('HANDLE_COOLDOWN', 409, { availableAt: '2026-12-01T00:00:00Z' })).repo;
    const e = await cooldown.updateAccount({ handle: 'x.y' }, {} as Account).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(SettingsError);
    expect(e).toMatchObject({ code: 'handleCooldown', availableAt: '2026-12-01T00:00:00Z' });
    const reauth = fake(() => api('REAUTH_REQUIRED', 403)).repo;
    await expect(reauth.deleteAccount(null)).rejects.toMatchObject({ code: 'reauthRequired' });
  });

  it('lists drafts only, and deletes with DELETE /posts/:id', async () => {
    const { repo, calls } = fake((c) =>
      c.method === 'GET'
        ? {
            items: [
              { id: 'd1', type: 'plan', title: 'Weekend in Accra', status: 'draft', updatedAt: '2026-10-30' },
              { id: 'p2', type: 'event', title: 'Live', status: 'published', updatedAt: '2026-10-31' },
            ],
            nextCursor: null,
          }
        : undefined,
    );
    expect(await repo.listDrafts()).toEqual([
      { id: 'd1', type: 'plan', title: 'Weekend in Accra', updatedAt: '2026-10-30' },
    ]);
    expect(calls[0]?.path).toBe('/api/v1/me/posts?status=draft&limit=50');
    await repo.deleteDraft('d1');
    expect(calls[1]).toMatchObject({ method: 'DELETE', path: '/api/v1/posts/d1' });
  });

  it('takes the support links from the app config', async () => {
    const { repo } = fake(() => undefined);
    expect(await repo.getSupportLinks()).toEqual({
      faqUrl: 'https://f',
      supportEmail: 'help@ajala',
      termsUrl: 'https://t',
      privacyUrl: 'https://p',
    });
  });
});
