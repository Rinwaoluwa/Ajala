import { describe, expect, it } from '@jest/globals';

import { ApiError } from '@core/api/ApiError';

import { NotificationsError } from '../../domain/entities/NotificationsError';
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
  category: 'new_message',
  title: 'Lagos Weekend Crew',
  body: 'Kofi: hello',
  data: { kind: 'message', postId: 'p1', conversationId: 'c1' },
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
          kind: 'new_message',
          title: 'Lagos Weekend Crew',
          body: 'Kofi: hello',
          at: '2026-11-02T10:00:00Z',
          read: false,
          postId: 'p1',
          conversationId: 'c1',
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
    expect(page.items[0]).toMatchObject({ kind: 'post_update', read: true, postId: null, conversationId: null });
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
