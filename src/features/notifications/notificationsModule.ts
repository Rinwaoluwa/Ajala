import { pushTokenStore } from './data/datasources/local/pushTokenStore';
import type { NotificationsRequest } from './data/datasources/remote/notificationsApi';
import { createNotificationsRepository } from './data/repositories/NotificationsRepositoryImpl';
import { createPushDevicesRepository } from './data/repositories/PushDevicesRepositoryImpl';
import { makeLoadInbox, makeMarkAllRead, makeMarkRead } from './domain/usecases/NotificationsUseCases';
import { makeRegisterPushDevice, makeUnregisterPushDevice } from './domain/usecases/PushUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createNotificationsUseCases(request: NotificationsRequest) {
  const repo = createNotificationsRepository(request);
  const devices = createPushDevicesRepository(request, pushTokenStore);
  return {
    loadInbox: makeLoadInbox(repo),
    markRead: makeMarkRead(repo),
    markAllRead: makeMarkAllRead(repo),
    registerPushDevice: makeRegisterPushDevice(devices),
    unregisterPushDevice: makeUnregisterPushDevice(devices),
  };
}

export type NotificationsUseCases = ReturnType<typeof createNotificationsUseCases>;
