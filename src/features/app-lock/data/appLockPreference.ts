import { secureStore } from '@core/storage/secure/secureStore';

import type { AppLockPreference } from '../domain/appLockRules';

/**
 * Whether biometric unlock is on, kept in the keychain beside the session it
 * guards: a preference anyone could flip in plain storage would be no lock.
 * A read that fails reads as "off" — the person signs in with their password.
 */
const KEY = 'app_lock.enabled';

export const appLockPreference: AppLockPreference = {
  isEnabled: async () => (await secureStore.get(KEY)) === '1',
  setEnabled: (enabled) => (enabled ? secureStore.set(KEY, '1') : secureStore.remove(KEY)),
};
