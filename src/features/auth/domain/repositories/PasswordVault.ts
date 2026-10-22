/**
 * The person's password manager — iCloud Keychain, Google Password Manager, or
 * whichever they use — and this device's memory of having offered to save to it.
 *
 * The data layer implements it over the platform's credential APIs and secure
 * storage. Nothing here rejects: a manager that is missing or says no is not an
 * error anyone needs to see.
 */

export type PasswordSaveOutcome =
  /** Saved, or updated, in the manager. */
  | 'saved'
  /** Offered, and the person said no. */
  | 'dismissed'
  /** The operating system offers by itself (iOS); the app has nothing to do. */
  | 'system'
  /** No manager, no prompt — nothing happened. */
  | 'unavailable';

export interface PasswordVault {
  offer(account: string, password: string): Promise<PasswordSaveOutcome>;
  hasOffered(account: string): Promise<boolean>;
  markOffered(account: string): Promise<void>;
  /** Forget every account offered for, so each is offered again. */
  forgetOffers(): Promise<void>;
}
