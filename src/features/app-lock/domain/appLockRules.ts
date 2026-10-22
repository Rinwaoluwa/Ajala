/**
 * When Ajala asks for Face ID (or the phone's other biometric) before showing
 * itself, once the person has turned it on:
 *   - on every cold start with a stored session;
 *   - on returning to the app after `RELOCK_AFTER_MS` in the background.
 * A shorter trip away (answering a message, copying a code) does not ask again.
 *
 * A sign-in made just now is never locked: the person has only just proved who
 * they are.
 */

export const RELOCK_AFTER_MS = 5 * 60 * 1000;

export function shouldRelock(backgroundedAt: number | null, now: number): boolean {
  return backgroundedAt !== null && now - backgroundedAt >= RELOCK_AFTER_MS;
}

export interface AppLockPreference {
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
}
