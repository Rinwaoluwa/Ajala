import { secureStore } from '@core/storage/secure/secureStore';

import type { AuthSession } from '../../../domain/entities/AuthSession';
import type { SessionStore } from '../../../domain/repositories/SessionStore';

/**
 * Where the signed-in session lives between launches.
 *
 * Tokens go to the secure store — the iOS keychain, Android's encrypted
 * preferences — and never to AsyncStorage, which is plain files any backup or
 * rooted device can read.
 *
 * Stored as one JSON blob under a single key: the parts are only ever read and
 * written together, and one keychain round trip at launch beats four.
 */

const SESSION_KEY = 'ajala.auth.session.v1';

export const sessionStorage: SessionStore = {
  async read(): Promise<AuthSession | null> {
    const raw = await secureStore.get(SESSION_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as AuthSession;
      // A blob written by an older build may not have what the app needs now.
      if (!parsed?.accessToken || !parsed?.refreshToken) return null;
      return parsed;
    } catch {
      return null;
    }
  },

  async write(session: AuthSession): Promise<void> {
    await secureStore.set(SESSION_KEY, JSON.stringify(session));
  },

  async clear(): Promise<void> {
    await secureStore.remove(SESSION_KEY);
  },
};
