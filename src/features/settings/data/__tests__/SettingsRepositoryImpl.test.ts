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
  extras: { languages: ['en'], pronouns: 'she/her', travelStyles: ['solo', 'not_a_style'] },
  favouriteCities: [{ id: 'accra', name: 'Accra', countryCode: 'GH', label: 'Accra, Ghana' }],
  identities: [{ provider: 'google' }],
};

const SETTINGS = {
  notifyJoinRequest: true,
  notifyRequestAccepted: true,
  notifyPostReminder: true,
  notifyNewComment: true,
  notifyNewMessage: true,
  notifySubscription: true,
  readReceipts: true,
  dmPermission: 'shared_only',
  hiddenFromSearch: false,
  analyticsOptOut: true,
  showCurrentCity: true,
  openToMeetToday: false,
  sharePlans: true,
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
      // A slug outside the API's list could not be saved back, so it is dropped.
      travelStyles: ['solo'],
      favouriteCities: [{ id: 'accra', name: 'Accra', label: 'Accra, Ghana' }],
      identities: [{ provider: 'google' }],
    });
  });

  it('sends travel styles and favourite cities inside extras', async () => {
    const { repo, calls } = fake(() => ME);
    const current = (await repo.getAccount()) as Account;
    await repo.updateAccount({ travelStyles: ['beach'], favouriteCityIds: ['lisbon'] }, current);
    expect(calls[1]?.body).toEqual({
      extras: {
        languages: ['en'],
        pronouns: 'she/her',
        travelStyles: ['beach'],
        favouriteCityIds: ['lisbon'],
      },
    });
  });

  it('reads the settings, and changes analytics through its own call', async () => {
    const { repo, calls } = fake(() => SETTINGS);
    expect(await repo.getSettings()).toEqual(SETTINGS);
    await repo.updateSettings({ openToMeetToday: true });
    expect(calls[1]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/me/settings',
      body: { openToMeetToday: true },
    });
    await repo.setAnalytics(true);
    expect(calls[2]).toMatchObject({
      method: 'PATCH',
      path: '/api/v1/me/analytics',
      body: { enabled: true },
    });
  });

  it('re-authenticates with a password or an emailed code', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.sendReauthCode();
    await repo.reauthenticate({ code: '123456' });
    await repo.reauthenticate({ password: 'secret' });
    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/me/reauth/code' },
      { method: 'POST', path: '/api/v1/me/reauth', body: { code: '123456' } },
      { method: 'POST', path: '/api/v1/me/reauth', body: { password: 'secret' } },
    ]);
    const wrong = fake(() => api('UNAUTHORIZED', 401)).repo;
    await expect(wrong.reauthenticate({ code: '123456' })).rejects.toMatchObject({ code: 'badCode' });
    await expect(wrong.reauthenticate({ password: 'x' })).rejects.toMatchObject({ code: 'wrongPassword' });
  });

  it('unlinks a provider, and says when it is the last way in', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.unlinkIdentity('google');
    expect(calls[0]).toMatchObject({ method: 'DELETE', path: '/api/v1/me/identities/google' });
    const last = fake(() => api('LAST_SIGN_IN_METHOD', 409)).repo;
    await expect(last.unlinkIdentity('apple')).rejects.toMatchObject({ code: 'lastSignInMethod' });
  });

  it('sets a first password, and reads its 403 and 409', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.setPassword('Travel2026');
    expect(calls[0]).toMatchObject({
      method: 'POST',
      path: '/api/v1/me/password/set',
      body: { newPassword: 'Travel2026' },
    });
    await expect(fake(() => api('CONFLICT', 409)).repo.setPassword('Travel2026')).rejects.toMatchObject({
      code: 'alreadyHasPassword',
    });
    await expect(
      fake(() => api('EMAIL_NOT_VERIFIED', 403)).repo.setPassword('Travel2026'),
    ).rejects.toMatchObject({ code: 'emailNotVerified' });
  });

  it('asks for and reads a data export', async () => {
    const dto = {
      id: 'x1',
      status: 'queued',
      requestedAt: '2026-11-06T10:00:00Z',
      readyAt: null,
      expiresAt: null,
      downloadUrl: null,
    };
    const { repo, calls } = fake(() => dto);
    expect(await repo.requestExport()).toEqual(dto);
    expect(await repo.getExport()).toEqual(dto);
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      'POST /api/v1/me/export',
      'GET /api/v1/me/export',
    ]);
    // Never asked for is a state, not a failure.
    expect(await fake(() => api('NOT_FOUND', 404)).repo.getExport()).toBeNull();
    await expect(fake(() => api('CONFLICT', 409)).repo.requestExport()).rejects.toMatchObject({
      code: 'exportTooSoon',
    });
    await expect(fake(() => api('REAUTH_REQUIRED', 403)).repo.getExport()).rejects.toMatchObject({
      code: 'reauthRequired',
    });
  });

  it('pages through my reports', async () => {
    const report = {
      id: 'r1',
      targetType: 'post',
      targetId: 'p1',
      reason: 'spam',
      status: 'open',
      createdAt: '2026-11-01T00:00:00Z',
      resolvedAt: null,
    };
    const { repo, calls } = fake(() => ({ items: [report], nextCursor: 'c2' }));
    const first = await repo.listReports(null);
    expect(first).toEqual({
      items: [
        {
          id: 'r1',
          targetType: 'post',
          reason: 'spam',
          status: 'open',
          createdAt: report.createdAt,
          resolvedAt: null,
        },
      ],
      nextCursor: 'c2',
    });
    await repo.listReports('c2');
    expect(calls.map((c) => c.path)).toEqual([
      '/api/v1/me/reports?limit=20',
      '/api/v1/me/reports?limit=20&cursor=c2',
    ]);
  });

  it('signs out everywhere with POST /auth/logout/all', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.signOutEverywhere();
    expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/v1/auth/logout/all' });
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
    await expect(wrapped.reauthenticate({ password: 'x' })).rejects.toMatchObject({ code: 'wrongPassword' });
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
    // The date is no longer documented: without it the cooldown still reads as itself.
    const bare = fake(() => api('HANDLE_COOLDOWN', 409)).repo;
    await expect(bare.updateAccount({ handle: 'x.y' }, {} as Account)).rejects.toMatchObject({
      code: 'handleCooldown',
      availableAt: null,
    });
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
