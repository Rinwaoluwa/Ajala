import type { NotificationsRepository } from '../../domain/repositories/NotificationsRepository';
import { createNotificationsApi, type NotificationsRequest } from '../datasources/remote/notificationsApi';
import { toNotificationsError, toNotificationsPage } from '../mappers/notificationsMappers';

/**
 * `NotificationsRepository` over the API. Nothing is cached here: the screen's
 * queries cache, and the inbox should be fresh each time it is opened anyway.
 */
export function createNotificationsRepository(request: NotificationsRequest): NotificationsRepository {
  const api = createNotificationsApi(request);
  return {
    async list(unread, cursor, limit) {
      try {
        return toNotificationsPage(await api.list(unread, cursor, limit));
      } catch (e) {
        throw toNotificationsError(e);
      }
    },
    async markRead(ids) {
      try {
        // Leaving `ids` out is how the API says "everything"; an empty list would mark nothing.
        await api.markRead(ids ? { ids: [...ids] } : {});
      } catch (e) {
        throw toNotificationsError(e);
      }
    },
  };
}
