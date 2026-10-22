import * as SecureStore from 'expo-secure-store';

/**
 * Values that must not sit in plain storage: access and refresh tokens.
 *
 * Backed by the iOS keychain and Android's EncryptedSharedPreferences. Anything
 * non-sensitive belongs in AsyncStorage instead — the secure store is small,
 * slower, and on some devices can fail outright.
 *
 * Every call is best effort. A keychain read can throw (a locked device, a
 * restored backup, a user who wiped credentials), and a thrown error at startup
 * would strand someone on a blank screen. A miss reads as "not signed in", which
 * is both true enough and recoverable: they sign in again.
 */
export const secureStore = {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async set(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Losing the write means the next launch asks them to sign in again.
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Nothing to do: the caller is signing out either way.
    }
  },
};
