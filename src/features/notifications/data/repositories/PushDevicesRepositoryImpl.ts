import { getDeviceId, getTimezone } from '@core/device/deviceIdentity';

import type { PushDevicesRepository } from '../../domain/repositories/PushDevicesRepository';
import type { PushTokenStore } from '../datasources/local/pushTokenStore';
import { createNotificationsApi, type NotificationsRequest } from '../datasources/remote/notificationsApi';
import { toNotificationsError } from '../mappers/notificationsMappers';

/** `PushDevicesRepository` over the API, with the registered token in `tokens`. */
export function createPushDevicesRepository(
  request: NotificationsRequest,
  tokens: PushTokenStore,
): PushDevicesRepository {
  const api = createNotificationsApi(request);
  return {
    // The same device id sign-in sends (core/device), so the API links the token to this device's sessions.
    identity: async () => ({ deviceId: await getDeviceId(), timezone: getTimezone() ?? null }),
    async register(registration) {
      try {
        await api.registerDevice(registration);
      } catch (e) {
        throw toNotificationsError(e);
      }
    },
    async unregister(token) {
      try {
        await api.unregisterDevice({ token });
      } catch (e) {
        throw toNotificationsError(e);
      }
    },
    registeredToken: () => tokens.read(),
    setRegisteredToken: (token) => tokens.write(token),
  };
}
