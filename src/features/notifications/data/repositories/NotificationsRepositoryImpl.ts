import type { NotificationsRepository } from '../../domain/repositories/NotificationsRepository';

/**
 * The notifications list — EMPTY until the API has one.
 *
 * Today the backend only pushes (spec §2.10, API map §11): request accepted,
 * removed, cancelled, reminders. There is no endpoint to list past
 * notifications or mark them read, so this answers an empty list and the screen
 * shows its empty state. When `GET /me/notifications` (or similar) exists, call
 * it here; nothing above this file needs to change.
 */
export function createNotificationsRepository(): NotificationsRepository {
  return { list: async () => [] };
}
