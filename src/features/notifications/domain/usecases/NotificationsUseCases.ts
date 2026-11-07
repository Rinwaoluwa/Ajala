import type { NotificationsRepository } from '../repositories/NotificationsRepository';
import { NOTIFICATIONS_PAGE_SIZE } from '../rules/notificationRules';

/** A page of the inbox: everything, or only the unread (the server filters). */
export const makeLoadInbox = (repo: NotificationsRepository) => (unread: boolean, cursor: string | null) =>
  repo.list(unread, cursor, NOTIFICATIONS_PAGE_SIZE);

/** Marks one notification read, as tapping it does. */
export const makeMarkRead = (repo: NotificationsRepository) => (id: string) => repo.markRead([id]);

/** Marks the whole inbox read; the API does that when no ids are sent. */
export const makeMarkAllRead = (repo: NotificationsRepository) => () => repo.markRead();
