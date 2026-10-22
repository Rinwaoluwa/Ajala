import { AuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { canSubmitNewPassword } from '../rules/credentialRules';

/**
 * Sets the new password using the token from the emailed link (FRD MOB-006,
 * `POST /auth/password/reset { token, newPassword }` → 204).
 *
 * Re-checks the rules and the confirmation match even though the screen only
 * enables the button when both pass. The screen is a convenience; this is the gate.
 *
 * A reset "signs out every device" (spec §2.2) — this one included, if someone
 * was signed in here when they opened the link. `onSignedOutEverywhere` drops
 * that now-dead local session, so the app does not carry on as if signed in
 * until its next call fails.
 */
export const makeResetPassword =
  (repo: AuthRepository, onSignedOutEverywhere: () => Promise<void> = async () => undefined) =>
  async (token: string, newPassword: string, confirmation: string): Promise<void> => {
    if (!token) throw new AuthError('invalidCode');
    if (!canSubmitNewPassword(newPassword, confirmation)) throw new AuthError('invalidDetails');
    await repo.resetPassword(token, newPassword);
    await onSignedOutEverywhere();
  };

export type ResetPasswordUseCase = ReturnType<typeof makeResetPassword>;
