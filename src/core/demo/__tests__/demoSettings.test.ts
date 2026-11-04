import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

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

  it('keeps preference changes', async () => {
    await demoRequest({ method: 'PATCH', path: '/api/v1/me/settings', body: { showAge: true } });
    expect(await demoRequest({ method: 'GET', path: '/api/v1/me/settings' })).toMatchObject({
      showAge: true,
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

  it('schedules deletion 14 days out', async () => {
    const { purgeAt } = await demoRequest<{ purgeAt: string }>({
      method: 'DELETE',
      path: '/api/v1/me',
      body: {},
    });
    expect(new Date(purgeAt).getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);
  });
});
