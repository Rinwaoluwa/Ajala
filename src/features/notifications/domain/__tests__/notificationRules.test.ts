import { describe, expect, it } from '@jest/globals';

import type { AppNotification } from '../entities/Notification';
import { shortAgo, visibleNotifications } from '../rules/notificationRules';

const n = (id: string, at: string, read: boolean): AppNotification => ({
  id,
  kind: 'reminder',
  title: id,
  body: '',
  at,
  read,
  avatarUrl: null,
  postId: null,
});

describe('notifications', () => {
  it('lists newest first, and only the unread under Unread', () => {
    const list = [n('old', '2026-11-01T10:00:00Z', false), n('new', '2026-11-02T10:00:00Z', true)];
    expect(visibleNotifications(list, 'all').map((x) => x.id)).toEqual(['new', 'old']);
    expect(visibleNotifications(list, 'unread').map((x) => x.id)).toEqual(['old']);
  });

  it('writes short times as the design does', () => {
    const now = new Date('2026-11-02T12:00:00Z');
    expect(shortAgo('2026-11-02T11:58:00Z', now)).toBe('2m');
    expect(shortAgo('2026-11-02T11:00:00Z', now)).toBe('1h');
    expect(shortAgo('2026-11-01T12:00:00Z', now)).toBe('1d');
    expect(shortAgo('2026-10-19T12:00:00Z', now)).toBe('2w');
  });
});
