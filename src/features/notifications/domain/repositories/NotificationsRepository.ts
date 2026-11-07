import type { NotificationsPage } from '../entities/Notification';

/**
 * The inbox (spec §2.17, API map §11). Every method throws `NotificationsError`.
 */
export interface NotificationsRepository {
  /** `GET /me/notifications`: newest first, the last 90 days; `unread` filters on the server. */
  list(unread: boolean, cursor: string | null, limit: number): Promise<NotificationsPage>;
  /** `POST /me/notifications/read`: these ids, or everything when `ids` is left out. */
  markRead(ids?: readonly string[]): Promise<void>;
}
