import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { NotificationsError } from '../../domain/entities/NotificationsError';
import { targetOf } from '../../domain/rules/notificationRules';
import { createNotificationsRepository } from '../repositories/NotificationsRepositoryImpl';

type Call = { method: string; path: string; body?: unknown };

function fake(answer: (call: Call) => unknown) {
  const calls: Call[] = [];
  const request = async <T>(call: Call): Promise<T> => {
    calls.push(call);
    const result = answer(call);
    if (result instanceof Error) throw result;
    return result as T;
  };
  return { repo: createNotificationsRepository(request), calls };
}

const DTO = {
  id: 'n1',
  category: 'post_update',
  title: 'Jazz on the Terrace changed',
  body: 'It now starts at 8:00 PM.',
  data: { kind: 'post.details_changed', postId: 'p1' },
  readAt: null,
  createdAt: '2026-11-02T10:00:00Z',
};

describe('NotificationsRepository', () => {
  it('asks for the server-filtered list and maps it', async () => {
    const { repo, calls } = fake(() => ({ items: [DTO], nextCursor: '20', unreadCount: 4 }));
    const page = await repo.list(true, 'abc', 20);
    expect(calls[0]).toEqual({ method: 'GET', path: '/api/v1/me/notifications?unread=true&cursor=abc&limit=20' });
    expect(page).toEqual({
      items: [
        {
          id: 'n1',
          kind: 'post_update',
          title: 'Jazz on the Terrace changed',
          body: 'It now starts at 8:00 PM.',
          at: '2026-11-02T10:00:00Z',
          read: false,
          postId: 'p1',
        },
      ],
      nextCursor: '20',
      unreadCount: 4,
    });
  });

  it('leaves the cursor out of the first page and copes with an unknown category and no data', async () => {
    const { repo, calls } = fake(() => ({
      items: [{ ...DTO, category: 'something_new', data: null, readAt: '2026-11-02T11:00:00Z' }],
      nextCursor: null,
      unreadCount: 0,
    }));
    const page = await repo.list(false, null, 20);
    expect(calls[0]?.path).toBe('/api/v1/me/notifications?unread=false&limit=20');
    expect(page.items[0]).toMatchObject({ kind: 'post_update', read: true, postId: null });
  });

  it('reads a stray chat category as a post update rather than failing (chat is push only)', async () => {
    const { repo } = fake(() => ({
      items: [{ ...DTO, category: 'new_message', data: { kind: 'chat.message', conversationId: 'c1' } }],
      nextCursor: null,
      unreadCount: 1,
    }));
    const page = await repo.list(false, null, 20);
    expect(page.items[0]).toMatchObject({ kind: 'post_update', postId: null });
  });

  it('reads a trusted-person item (Share my plan) as its own kind, going nowhere yet', async () => {
    const { repo } = fake(() => ({
      items: [{ ...DTO, category: 'trusted_person', data: { kind: 'trusted.request', linkId: 'tl-1' } }],
      nextCursor: null,
      unreadCount: 1,
    }));
    const page = await repo.list(false, null, 20);
    expect(page.items[0]).toMatchObject({ kind: 'trusted_person', postId: null });
    expect(targetOf(page.items[0]!)).toBeNull();
  });

  it('marks some read, or everything by leaving ids out', async () => {
    const { repo, calls } = fake(() => undefined);
    await repo.markRead(['n1']);
    await repo.markRead();
    expect(calls).toEqual([
      { method: 'POST', path: '/api/v1/me/notifications/read', body: { ids: ['n1'] } },
      { method: 'POST', path: '/api/v1/me/notifications/read', body: {} },
    ]);
  });

  it('turns API failures into NotificationsError by code', async () => {
    const offline = fake(() => new ApiError({ status: 0, code: 'NETWORK', message: 'offline' }));
    await expect(offline.repo.list(false, null, 20)).rejects.toMatchObject({ code: 'network' });
    const expired = fake(() => new ApiError({ status: 401, code: 'UNAUTHORIZED', message: 'no' }));
    const e = await expired.repo.markRead().catch((x: unknown) => x);
    expect(e).toBeInstanceOf(NotificationsError);
    expect(e).toMatchObject({ code: 'sessionExpired' });
  });
});
