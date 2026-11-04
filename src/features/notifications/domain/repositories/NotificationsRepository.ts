import type { AppNotification } from '../entities/Notification';

/** Where the list comes from. */
export interface NotificationsRepository {
  list(): Promise<AppNotification[]>;
}
