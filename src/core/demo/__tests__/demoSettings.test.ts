import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';
import { store } from '../demoStore';

const signIn = () =>
  demoRequest({
    method: 'POST',
    path: '/api/v1/auth/login',
    body: { email: 'maya@ajala.demo', password: 'x' },
  });

describe('demo settings', () => {
  beforeEach(async () => {
    resetDemo();
    await signIn();
  });

  it('keeps preference changes, in the spec’s shape', async () => {
    const before = await demoRequest<Record<string, unknown>>({ method: 'GET', path: '/api/v1/me/settings' });
    expect(Object.keys(before).sort()).toEqual(
      [
        'analyticsOptOut',
        'dmPermission',
        'hiddenFromSearch',
        'notifyJoinRequest',
        'notifyNewComment',
        'notifyNewMessage',
        'notifyPostReminder',
        'notifyRequestAccepted',
        'notifySubscription',
        'openToMeetToday',
        'readReceipts',
        'sharePlans',
        'showCurrentCity',
      ].sort(),
    );
    await demoRequest({
      method: 'PATCH',
      path: '/api/v1/me/settings',
      body: { openToMeetToday: true, sharePlans: false, dmPermission: 'shared_only' },
    });
    expect(await demoRequest({ method: 'GET', path: '/api/v1/me/settings' })).toMatchObject({
      openToMeetToday: true,
      sharePlans: false,
      dmPermission: 'shared_only',
    });
  });

  it('changes analytics only through its own call', async () => {
    await expect(
      demoRequest({ method: 'PATCH', path: '/api/v1/me/settings', body: { analyticsOptOut: true } }),
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(
      await demoRequest({ method: 'PATCH', path: '/api/v1/me/analytics', body: { enabled: false } }),
    ).toMatchObject({ analyticsOptOut: true });
  });

  it('starts again with the demo world', async () => {
    await demoRequest({ method: 'PATCH', path: '/api/v1/me/settings', body: { readReceipts: false } });
    resetDemo();
    await signIn();
    expect(await demoRequest({ method: 'GET', path: '/api/v1/me/settings' })).toMatchObject({
      readReceipts: true,
    });
  });

  it('signs out another device but not this one', async () => {
    const before = await demoRequest<{ id: string; current: boolean }[]>({
      method: 'GET',
      path: '/api/v1/me/sessions',
    });
    const other = before.find((s) => !s.current);
    expect(other).toBeDefined();
    await demoRequest({ method: 'DELETE', path: `/api/v1/me/sessions/${other?.id}` });
    const after = await demoRequest<unknown[]>({ method: 'GET', path: '/api/v1/me/sessions' });
    expect(after).toHaveLength(before.length - 1);
  });

  it('refuses a wrong current password', async () => {
    await expect(
      demoRequest({
        method: 'POST',
        path: '/api/v1/me/password',
        body: { currentPassword: 'wrong', newPassword: 'Travel2026' },
      }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('changes the email after the code', async () => {
    await demoRequest({
      method: 'POST',
      path: '/api/v1/me/email/change',
      body: { newEmail: 'new@ajala.demo' },
    });
    await demoRequest({ method: 'POST', path: '/api/v1/me/email/change/confirm', body: { code: '123456' } });
    expect(await demoRequest({ method: 'GET', path: '/api/v1/me' })).toMatchObject({
      email: 'new@ajala.demo',
    });
  });

  it('re-authenticates with an emailed code once one was sent', async () => {
    const reauth = (body: object) => demoRequest({ method: 'POST', path: '/api/v1/me/reauth', body });
    await expect(reauth({ code: '123456' })).rejects.toMatchObject({ status: 401 });
    await demoRequest({ method: 'POST', path: '/api/v1/me/reauth/code' });
    await expect(reauth({ code: '000000' })).rejects.toMatchObject({ status: 401 });
    await expect(reauth({ code: '123456' })).resolves.toBeUndefined();
    await expect(reauth({ password: 'anything' })).resolves.toBeUndefined();
  });

  it('sets a first password only on an account without one', async () => {
    const set = () =>
      demoRequest({ method: 'POST', path: '/api/v1/me/password/set', body: { newPassword: 'Travel2026' } });
    // The demo person signs in with email, so they already have one.
    await expect(set()).rejects.toMatchObject({ status: 409 });
    // An Apple-only account, which no demo sign-in makes, so set one up directly.
    store.me = { ...(store.me as NonNullable<typeof store.me>), identities: ['apple'] };
    await expect(
      demoRequest({ method: 'DELETE', path: '/api/v1/me/identities/apple' }),
    ).rejects.toMatchObject({ status: 409, code: 'LAST_SIGN_IN_METHOD' });
    await set();
    const me = await demoRequest<{ identities: { provider: string }[] }>({
      method: 'GET',
      path: '/api/v1/me',
    });
    expect(me.identities.map((i) => i.provider).sort()).toEqual(['apple', 'email']);
    await demoRequest({ method: 'DELETE', path: '/api/v1/me/identities/apple' });
  });

  it('exports data once a day: queued, then ready with a link', async () => {
    await expect(demoRequest({ method: 'GET', path: '/api/v1/me/export' })).rejects.toMatchObject({
      status: 404,
    });
    const queued = await demoRequest<{ status: string; downloadUrl: string | null }>({
      method: 'POST',
      path: '/api/v1/me/export',
    });
    expect(queued).toMatchObject({ status: 'queued', downloadUrl: null });
    await expect(demoRequest({ method: 'POST', path: '/api/v1/me/export' })).rejects.toMatchObject({
      status: 409,
    });
    const later = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000);
    try {
      expect(await demoRequest({ method: 'GET', path: '/api/v1/me/export' })).toMatchObject({
        status: 'ready',
        downloadUrl: expect.stringMatching(/^https:/),
      });
    } finally {
      later.mockRestore();
    }
  });

  it('lists my reports newest first, with a post reported this run', async () => {
    const first = await demoRequest<{ items: { targetType: string; status: string }[] }>({
      method: 'GET',
      path: '/api/v1/me/reports',
    });
    expect(first.items.map((r) => r.status)).toEqual(['resolved', 'dismissed']);
    await demoRequest({ method: 'POST', path: '/api/v1/posts/p-jazz/report', body: { reason: 'spam' } });
    const after = await demoRequest<{ items: { targetType: string; status: string }[]; nextCursor: null }>({
      method: 'GET',
      path: '/api/v1/me/reports',
    });
    expect(after.items[0]).toMatchObject({ targetType: 'post', status: 'open' });
    expect(after.nextCursor).toBeNull();
  });

  it('schedules deletion 14 days out', async () => {
    const { purgeAt } = await demoRequest<{ purgeAt: string }>({
      method: 'DELETE',
      path: '/api/v1/me',
      body: {},
    });
    expect(new Date(purgeAt).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
  });
});
