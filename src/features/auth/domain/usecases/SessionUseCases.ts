import { AuthError, isAuthError } from '../entities/AuthError';
import type { AuthSession } from '../entities/AuthSession';
import type { AuthRepository } from '../repositories/AuthRepository';
import type { SessionStore } from '../repositories/SessionStore';
import { shouldRefreshBefore } from '../rules/sessionRules';

/**
 * Keeping, restoring, using and ending the signed-in session.
 *
 * These exist so presentation never touches storage directly: a hook asks for
 * "restore my session", not "read this key out of the keychain".
 */

/** The session from a previous launch, or null. */
export const makeRestoreSession = (store: SessionStore) => (): Promise<AuthSession | null> =>
  store.read();

/** Keeps a session the API just issued. */
export const makeKeepSession =
  (store: SessionStore) =>
  (session: AuthSession): Promise<void> =>
    store.write(session);

/**
 * Runs a call that needs the access token, refreshing when it has expired.
 *
 * Access tokens live 15 minutes. One that is about to expire (under a minute
 * left, `shouldRefreshBefore`) is exchanged before the call; one the API refuses
 * anyway is exchanged after, and the call retried ONCE. The rules that make this
 * safe all come from one fact — refresh tokens are single use, and presenting a
 * spent one revokes the whole session (spec §1.1):
 *
 *   - ONE refresh at a time. Every caller that needs a new pair awaits the same
 *     in-flight promise rather than starting its own.
 *   - Never refresh with a token someone else already spent. A call that read
 *     the session just before another call rotated it would otherwise present
 *     the old refresh token. So the refresh re-reads the store first, and a call
 *     whose token was replaced meanwhile simply retries with the replacement.
 *   - The new pair is stored before it is used. If the app dies in between, the
 *     next launch has the live token, not the spent one.
 *   - A refresh that lands after sign-out is dropped, not stored, so it cannot
 *     sign the person back in.
 *
 * A refresh the API refuses ends the session: it is cleared here and
 * `onSessionEnded` is told, so the app can send the person to sign in. A refresh
 * that fails for any other reason (offline) leaves the session alone — it may
 * still be good once the network is back.
 */
export function makeWithSession(
  repo: AuthRepository,
  store: SessionStore,
  onSessionEnded: () => void = () => undefined,
  now: () => number = () => Date.now(),
) {
  let refreshing: Promise<AuthSession> | null = null;

  async function endSession(): Promise<never> {
    await store.clear();
    onSessionEnded();
    throw new AuthError('sessionExpired');
  }

  /** A pair newer than `stale`: whoever's refresh is in flight, or a new one. */
  function refresh(stale: AuthSession): Promise<AuthSession> {
    refreshing ??= (async () => {
      try {
        const current = await store.read();
        // Signed out since the caller looked: there is nothing left to refresh.
        if (!current) throw new AuthError('sessionExpired');
        // Already rotated by another call: that pair is the answer, and the
        // token in `stale` must never be presented again.
        if (current.refreshToken !== stale.refreshToken) return current;

        let next: AuthSession;
        try {
          next = await repo.refreshSession(current.refreshToken);
        } catch (e) {
          // Refused: the session is over here as it is on the server.
          if (isAuthError(e) && e.code === 'sessionExpired') return await endSession();
          throw e;
        }

        const latest = await store.read();
        // Signed out while the refresh was out: drop the new pair.
        if (!latest) throw new AuthError('sessionExpired');
        // Signed in afresh meanwhile: that newer session stands.
        if (latest.refreshToken !== current.refreshToken) return latest;
        // A refresh answer carries no profile; keep what we already knew.
        const kept: AuthSession = { ...next, userId: next.userId ?? current.userId, isNew: current.isNew };
        await store.write(kept);
        return kept;
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  }

  /** The session to use now, refreshed first when its token is about to lapse. */
  async function usableSession(): Promise<AuthSession> {
    const session = await store.read();
    if (!session) return endSession();
    if (!refreshing && !shouldRefreshBefore(session, now())) return session;
    try {
      return await refresh(session);
    } catch (e) {
      // Offline: the old token may have seconds left, and a 401 still recovers.
      if (isAuthError(e) && e.code === 'sessionExpired') throw e;
      return session;
    }
  }

  return async function withSession<T>(call: (accessToken: string) => Promise<T>): Promise<T> {
    const session = await usableSession();
    try {
      return await call(session.accessToken);
    } catch (e) {
      if (!isAuthError(e) || e.code !== 'sessionExpired') throw e;
      const fresh = await refresh(session);
      try {
        return await call(fresh.accessToken);
      } catch (retryError) {
        // A brand-new token refused straight away: the session is gone server side.
        if (isAuthError(retryError) && retryError.code === 'sessionExpired') return endSession();
        throw retryError;
      }
    }
  };
}

export type WithSession = ReturnType<typeof makeWithSession>;

/**
 * Forgets this device's session without telling the API — for when the API has
 * already ended it, as a password reset does for every device (spec §2.2).
 * Nothing happens when no one is signed in.
 */
export const makeEndLocalSession =
  (store: SessionStore, onSessionEnded: () => void = () => undefined) =>
  async (): Promise<void> => {
    if (!(await store.read())) return;
    await store.clear();
    onSessionEnded();
  };

/**
 * Ends the session on the server and on this device (`POST /auth/logout`).
 *
 * Goes through `withSession`, so an access token that lapsed while the app sat
 * idle is refreshed first: a logout sent with a dead token answers 401 and leaves
 * the server-side session — and its refresh token — alive for up to 30 days.
 *
 * Never rejects: the local session is cleared either way, so a dead network
 * leaves one stale server-side session rather than a user stuck signed in.
 *
 * PUSH: the spec has `POST /me/devices/unregister { token }` go first, so the
 * phone stops getting this account's pushes. Push registration is not built yet
 * ("still in works"); when it is, unregister here, before the logout, with the
 * same `withSession`.
 */
export const makeSignOut =
  (repo: AuthRepository, store: SessionStore, withSession: WithSession) =>
  async (): Promise<void> => {
    if (await store.read()) {
      try {
        await withSession((token) => repo.signOut(token));
      } catch {
        // Deliberately swallowed — see above.
      }
    }
    await store.clear();
  };

export type RestoreSessionUseCase = ReturnType<typeof makeRestoreSession>;
export type KeepSessionUseCase = ReturnType<typeof makeKeepSession>;
export type SignOutUseCase = ReturnType<typeof makeSignOut>;
export type EndLocalSessionUseCase = ReturnType<typeof makeEndLocalSession>;
