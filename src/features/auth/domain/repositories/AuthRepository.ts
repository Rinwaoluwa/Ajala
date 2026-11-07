import type { Account, IdentityProvider } from '../entities/Account';
import type { AuthSession } from '../entities/AuthSession';
import type { Credentials } from '../entities/Credentials';
import type { EmailVerification } from '../entities/EmailVerification';
import type { SignUpDetails } from '../entities/SignUpDetails';

/**
 * What the auth feature needs from a backend, shaped by the client spec
 * (`docs/api/ajala-api-users-common.md`, the `User / Auth` endpoints) and the
 * screen-to-API map.
 *
 * Methods reject with an `AuthError`, never a raw transport error.
 */
export interface AuthRepository {
  /**
   * Creates the account and has a code emailed (MOB-001).
   *
   * Resolves whether or not the address was already taken: the API answers the
   * same either way so that this screen cannot be used to discover who has an
   * account. An address already in use simply never receives a working code.
   */
  signUpWithEmail(details: SignUpDetails): Promise<EmailVerification>;

  /**
   * Confirms an emailed code, which also signs the person in — the API returns a
   * session here, so verifying a sign-up and signing in are one step.
   *
   * `password` is the one just chosen on the sign-up form. The spec makes it
   * REQUIRED when the code completes an email sign-up ("without it, or with the
   * wrong one, the answer is the same 401 as a wrong code", §2.2), and not
   * needed for an existing account that was never verified — so sign-in's
   * EMAIL_NOT_VERIFIED path sends none.
   */
  verifyEmailCode(email: string, code: string, password?: string): Promise<AuthSession>;

  /** Sends the code again. Capped at 3 an hour per address (then `rateLimited`). */
  resendEmailCode(email: string): Promise<void>;

  /**
   * Signs in (MOB-005).
   *
   * Rejects with `invalidCredentials` for a wrong pair or a locked account, and
   * with `emailNotVerified` when the account exists but was never confirmed — the
   * API re-sends a code in that case, so the caller should go to the code screen.
   */
  signIn(credentials: Credentials): Promise<AuthSession>;

  /**
   * Signs in or up with Google or Apple (MOB-003, MOB-004): one call either way,
   * and the session's `isNew` says which happened.
   *
   * Rejects with `accountLinkRequired` (carrying a `challengeId`) when the
   * provider's email already has an account, `cancelled` when the person closed
   * the provider's sheet, and `providerUnavailable` when it cannot run here.
   */
  signInWithProvider(provider: IdentityProvider): Promise<AuthSession>;

  /** Whether the provider can be offered here: Apple only on iOS, Google once configured. */
  isProviderAvailable(provider: IdentityProvider): Promise<boolean>;

  /** Finishes an account link with the code emailed to the existing account. */
  completeAccountLink(challengeId: string, code: string): Promise<AuthSession>;

  /**
   * Starts a password reset (MOB-006): the API emails a 6-digit code, which
   * `verifyPasswordResetCode` exchanges for a reset token. Calling it again sends
   * a new code.
   *
   * Resolves whether or not the address has an account, for the same reason as
   * sign-up. Capped at 3 emails an hour per address (then `rateLimited`).
   */
  requestPasswordReset(email: string): Promise<void>;

  /**
   * Exchanges the emailed reset code for a one-time reset token, which lasts 15
   * minutes. Rejects with `invalidCode` for a wrong, expired or used code — the
   * API does not say which, and burns the code on the fifth wrong try.
   */
  verifyPasswordResetCode(email: string, code: string): Promise<string>;

  /**
   * Sets a new password with the token from `verifyPasswordResetCode`. Ends every
   * session, this device's included. Rejects with `expiredCode` when the token
   * ran out or was already used (the reset must start again), and
   * `passwordBreached` like sign-up.
   */
  resetPassword(token: string, newPassword: string): Promise<void>;

  /**
   * Exchanges a refresh token for a new pair. The old one is void afterwards, and
   * presenting it again signs the session out — always keep the new pair.
   * Rejects with `sessionExpired` when the token is no good.
   */
  refreshSession(refreshToken: string): Promise<AuthSession>;

  /** The signed-in account. Rejects with `sessionExpired` on a dead access token. */
  getAccount(accessToken: string): Promise<Account>;

  /**
   * The terms in force: their version and where to read them. `fresh` skips any
   * remembered copy, for when the API has said the remembered version is stale.
   */
  getCurrentTerms(options?: { fresh?: boolean }): Promise<{ version: string; url: string; privacyUrl: string }>;

  /**
   * Records that the person accepted the terms in force. Rejects with
   * `termsOutdated` when `version` is no longer the one in force.
   */
  acceptTerms(accessToken: string, version: string): Promise<void>;

  /** Ends this device's session. Rejects with `sessionExpired` on a dead access token. */
  signOut(accessToken: string): Promise<void>;
}
