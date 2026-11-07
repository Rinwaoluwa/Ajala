import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { canSubmitNewPassword } from '../rules/credentialRules';

/**
 * Sets the new password using the reset token that the emailed code bought
 * (FRD MOB-006, `POST /auth/password/reset { token, newPassword }` → 204).
 *
 * Re-checks the rules and the confirmation match even though the screen only
 * enables the button when both pass. The screen is a convenience; this is the gate.
 *
 * A reset "signs out every device" (spec §2.2) — this one included, if someone
 * was signed in here while resetting. `onSignedOutEverywhere` drops
 * that now-dead local session, so the app does not carry on as if signed in
 * until its next call fails.
 */
export const makeResetPassword =
  (repo: AuthRepository, onSignedOutEverywhere: () => Promise<void> = async () => undefined) =>
  async (token: string, newPassword: string, confirmation: string): Promise<void> => {
    // No token means the code step never finished (or the app was restarted and
    // the in-memory token is gone): only a new code will do.
    if (!token) throw new AuthError('expiredCode');
    if (!canSubmitNewPassword(newPassword, confirmation)) throw new AuthError('invalidDetails');
    await repo.resetPassword(token, newPassword);
    await onSignedOutEverywhere();
  };

export type ResetPasswordUseCase = ReturnType<typeof makeResetPassword>;
