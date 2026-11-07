import { secureStore } from '@core/storage/secure/secureStore';

/**
 * The push token last registered with the API, so sign-out can unregister it
 * even in a later launch than the one that registered it.
 *
 * In the secure store rather than AsyncStorage: a push token addresses this
 * phone, and anyone holding it could send to it. The store never throws; a
 * failed read means sign-out skips the unregister, and the API drops the
 * token itself once FCM/APNs report it dead.
 */
const KEY = 'ajala.push.registeredToken.v1';

export const pushTokenStore = {
  read: (): Promise<string | null> => secureStore.get(KEY),
  write: (token: string | null): Promise<void> => (token ? secureStore.set(KEY, token) : secureStore.remove(KEY)),
};

export type PushTokenStore = typeof pushTokenStore;
