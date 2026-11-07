import { describe, expect, it } from '@jest/globals';

import type { AppNotification, NotificationKind, NotificationsPage } from '../entities/Notification';
import { markPagesRead, shortAgo, targetOf } from '../rules/notificationRules';

const n = (id: string, kind: NotificationKind, extra: Partial<AppNotification> = {}): AppNotification => ({
  id,
  kind,
  title: id,
  body: '',
  at: '2026-11-02T10:00:00Z',
  read: false,
  postId: null,
  conversationId: null,
  ...extra,
});

describe('where a notification opens', () => {
  it('opens the post it is about', () => {
    expect(targetOf(n('a', 'join_request', { postId: 'p1' }))).toEqual({ to: 'post', postId: 'p1' });
    expect(targetOf(n('b', 'new_comment', { postId: 'p2' }))).toEqual({ to: 'post', postId: 'p2' });
  });

  it('opens a message in its conversation, or Messages when the server did not say which', () => {
    expect(targetOf(n('m', 'new_message', { postId: 'p1', conversationId: 'c1' }))).toEqual({
      to: 'messages',
      conversationId: 'c1',
    });
    expect(targetOf(n('m', 'new_message'))).toEqual({ to: 'messages', conversationId: null });
  });

  it('opens the paywall for the subscription, and nothing for a report reviewed', () => {
    expect(targetOf(n('s', 'subscription'))).toEqual({ to: 'paywall' });
    expect(targetOf(n('r', 'moderation'))).toBeNull();
  });
});

describe('marking read in the cache', () => {
  const pages: NotificationsPage[] = [
    { items: [n('a', 'join_request'), n('b', 'new_comment', { read: true })], nextCursor: '2', unreadCount: 3 },
    { items: [n('c', 'post_reminder')], nextCursor: null, unreadCount: 3 },
  ];

  it('marks one and lowers the count on every page', () => {
    const next = markPagesRead(pages, ['c']);
    expect(next.flatMap((p) => p.items).filter((x) => !x.read).map((x) => x.id)).toEqual(['a']);
    expect(next.map((p) => p.unreadCount)).toEqual([2, 2]);
  });

  it('leaves the count alone for something already read', () => {
    expect(markPagesRead(pages, ['b']).map((p) => p.unreadCount)).toEqual([3, 3]);
  });

  it('marks everything, including rows not loaded yet, so the count is zero', () => {
    const next = markPagesRead(pages, null);
    expect(next.every((p) => p.items.every((x) => x.read) && p.unreadCount === 0)).toBe(true);
    expect(pages[0]?.items[0]?.read).toBe(false);
  });
});

describe('short times', () => {
  it('writes them as the design does', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    expect(shortAgo('2026-11-02T11:58:00Z', now)).toBe('2m');
    expect(shortAgo('2026-11-02T11:00:00Z', now)).toBe('1h');
    expect(shortAgo('2026-11-01T12:00:00Z', now)).toBe('1d');
    expect(shortAgo('2026-10-19T12:00:00Z', now)).toBe('2w');
  });
});
