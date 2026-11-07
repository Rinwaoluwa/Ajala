import { beforeEach, describe, expect, it } from '@jest/globals';

import { demoRequest, resetDemo } from '../demoApi';

type Inbox = {
  items: { id: string; category: string; readAt: string | null; data: { postId?: string } }[];
  nextCursor: string | null;
  unreadCount: number;
};

const signIn = () =>
  demoRequest({ method: 'POST', path: '/api/v1/auth/login', body: { email: 'a@b.c', password: 'x' } });

const inbox = (query = '') =>
  demoRequest<Inbox>({ method: 'GET', path: `/api/v1/me/notifications${query}` });

describe('the demo notifications inbox', () => {
  beforeEach(async () => {
    resetDemo();
    await signIn();
  });

  it('pages by cursor, with the whole inbox unread count on every page', async () => {
    const first = await inbox('?limit=5');
    expect(first.items).toHaveLength(5);
    expect(first.nextCursor).not.toBeNull();
    const rest = await inbox(`?limit=5&cursor=${first.nextCursor}`);
    expect(rest.items).toHaveLength(3);
    expect(rest.nextCursor).toBeNull();
    expect(first.unreadCount).toBe(4);
    expect(rest.unreadCount).toBe(4);
    expect(new Set([...first.items, ...rest.items].map((n) => n.category)).size).toBe(8);
  });

  it('filters unread on the server, and every postId opens a real post', async () => {
    const unread = await inbox('?unread=true');
    expect(unread.items.map((n) => n.readAt)).toEqual([null, null, null, null]);
    const all = await inbox();
    for (const id of all.items.map((n) => n.data.postId).filter(Boolean)) {
      await expect(demoRequest({ method: 'GET', path: `/api/v1/posts/${id}` })).resolves.toBeTruthy();
    }
  });

  it('ignores ids it does not know, and starts again after a reset', async () => {
    await demoRequest({ method: 'POST', path: '/api/v1/me/notifications/read', body: { ids: ['nope'] } });
    expect((await inbox()).unreadCount).toBe(4);
    await demoRequest({ method: 'POST', path: '/api/v1/me/notifications/read' });
    expect((await inbox()).unreadCount).toBe(0);
    resetDemo();
    await signIn();
    expect((await inbox()).unreadCount).toBe(4);
  });

  it('accepts push device registration and unregistration with no body (204)', async () => {
    const body = { token: 'apns-token', platform: 'ios', deviceId: 'ios-1', timezone: 'Africa/Lagos' };
    await expect(demoRequest({ method: 'POST', path: '/api/v1/me/devices', body })).resolves.toBeUndefined();
    // Idempotent: the same token again is fine.
    await expect(demoRequest({ method: 'POST', path: '/api/v1/me/devices', body })).resolves.toBeUndefined();
    await expect(
      demoRequest({ method: 'POST', path: '/api/v1/me/devices/unregister', body: { token: 'apns-token' } }),
    ).resolves.toBeUndefined();
    await expect(
      demoRequest({ method: 'POST', path: '/api/v1/me/devices', body: { platform: 'ios' } }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('refuses when signed out', async () => {
    resetDemo();
    await expect(inbox()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
