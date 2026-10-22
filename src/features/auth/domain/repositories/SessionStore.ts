import type { AuthSession } from '../entities/AuthSession';

/**
 * Where a session is kept between launches. The data layer implements it over
 * secure storage; the domain only knows that it can be read, written and cleared.
 *
 * Reads resolve to `null` rather than rejecting. A keychain that cannot be read —
 * a locked device, a restored backup — means "not signed in", which is both true
 * enough and recoverable.
 */
export interface SessionStore {
  read(): Promise<AuthSession | null>;
  write(session: AuthSession): Promise<void>;
  clear(): Promise<void>;
}
