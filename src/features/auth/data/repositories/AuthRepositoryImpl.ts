import type { Account, IdentityProvider } from '../../domain/entities/Account';
import { AuthError } from '../../domain/entities/AuthError';
import type { AuthSession } from '../../domain/entities/AuthSession';
import type { Credentials } from '../../domain/entities/Credentials';
import type { EmailVerification } from '../../domain/entities/EmailVerification';
import type { SignUpDetails } from '../../domain/entities/SignUpDetails';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { VERIFICATION_CODE_LENGTH } from '../../domain/rules/credentialRules';
import { fieldLimits, fitToLimit } from '../../domain/rules/fieldLimits';
import { isAppleSignInAvailable, requestAppleIdentity } from '../datasources/native/appleIdentity';
import {
  forgetGoogleAccount,
  isGoogleSignInConfigured,
  requestGoogleIdToken,
} from '../datasources/native/googleIdentity';
import { createNonce } from '../datasources/native/nonce';
import { authApi } from '../datasources/remote/authApi';
import {
  PROVIDER_CALL,
  SESSION_CALL,
  isTermsVersionRejection,
  toAuthError,
  toCodeError,
} from '../mappers/authErrorMapper';
import {
  toAccount,
  toAuthSession,
  toSignUpRequest,
  toVerifiedAuthSession,
} from '../mappers/authMappers';

/**
 * The real backend, over `core/api`.
 *
 * Its whole job is translation: call the endpoint, map the answer to an entity,
 * and turn an `ApiError` into the `AuthError` the rest of the app understands
 * (`authErrorMapper`). Nothing above this file knows a status code or an API
 * error string.
 */

async function signInWithApple(): Promise<AuthSession> {
  // A fresh nonce per attempt (spec §2.3): Apple is given its SHA-256, the API
  // the raw value, and the API refuses to see it twice.
  const nonce = await createNonce();
  const identity = await requestAppleIdentity(nonce);
  // Apple's name, first authorisation only: cut to the API's 60 rather than
  // failing the sign-in over a long name the person never typed here.
  const firstName = fitToLimit(identity.firstName, fieldLimits.nameMax);
  const lastName = fitToLimit(identity.lastName, fieldLimits.nameMax);
  return toVerifiedAuthSession(
    await authApi.signInWithApple({
      identityToken: identity.identityToken,
      authorizationCode: identity.authorizationCode,
      nonce: nonce.raw,
      ...(firstName ? { firstName } : null),
      ...(lastName ? { lastName } : null),
    }),
  );
}

async function signInWithGoogle(): Promise<AuthSession> {
  // FLAGGED (see googleIdentity): this SDK cannot hand the nonce to Google, so
  // the token carries none and the API is sent one it cannot match.
  const nonce = await createNonce();
  const idToken = await requestGoogleIdToken();
  try {
    return toVerifiedAuthSession(await authApi.signInWithGoogle({ idToken, nonce: nonce.raw }));
  } catch (e) {
    // Let the next attempt show the account picker again, so someone who chose
    // the wrong account is not stuck with it.
    await forgetGoogleAccount();
    throw e;
  }
}

export const createAuthRepository = (): AuthRepository => ({
  async signUpWithEmail(details: SignUpDetails): Promise<EmailVerification> {
    const request = toSignUpRequest(details);
    try {
      try {
        await authApi.signUpWithEmail(request);
      } catch (e) {
        // The terms changed since the app config was fetched: fetch it again and
        // send the version now in force, once. Nothing was emailed by the 400.
        if (!isTermsVersionRejection(e, 'termsVersion')) throw e;
        await authApi.signUpWithEmail(request, { freshTerms: true });
      }
      // 202 either way: whether the address already had an account is not said.
      return { email: details.email, codeLength: VERIFICATION_CODE_LENGTH };
    } catch (e) {
      throw toAuthError(e);
    }
  },

  async verifyEmailCode(email: string, code: string, password?: string): Promise<AuthSession> {
    try {
      return toVerifiedAuthSession(
        await authApi.verifyOtp({ target: email, code, ...(password ? { password } : null) }),
      );
    } catch (e) {
      // A wrong, expired or used code — or, completing a sign-up, a missing or
      // wrong password — is one indistinguishable 401.
      throw toCodeError(e, 'invalidCode');
    }
  },

  async resendEmailCode(email: string): Promise<void> {
    try {
      await authApi.resendOtp({ target: email });
    } catch (e) {
      throw toAuthError(e);
    }
  },

  async signIn(credentials: Credentials): Promise<AuthSession> {
    try {
      return toAuthSession(
        await authApi.login({
          email: credentials.email,
          password: credentials.password,
          ...(credentials.otpCode ? { otpCode: credentials.otpCode } : null),
        }),
      );
    } catch (e) {
      throw toAuthError(e);
    }
  },

  async signInWithProvider(provider: IdentityProvider): Promise<AuthSession> {
    try {
      return provider === 'apple' ? await signInWithApple() : await signInWithGoogle();
    } catch (e) {
      throw toAuthError(e, PROVIDER_CALL);
    }
  },

  async isProviderAvailable(provider: IdentityProvider): Promise<boolean> {
    return provider === 'apple' ? isAppleSignInAvailable() : isGoogleSignInConfigured();
  },

  async requestPasswordReset(email: string): Promise<void> {
    try {
      await authApi.forgotPassword({ email });
    } catch (e) {
      throw toAuthError(e);
    }
  },

  async verifyPasswordResetCode(email: string, code: string): Promise<string> {
    try {
      return (await authApi.verifyResetCode({ email, code })).token;
    } catch (e) {
      // A wrong, expired or used code is one indistinguishable 401.
      throw toCodeError(e, 'invalidCode');
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await authApi.resetPassword({ token, newPassword });
    } catch (e) {
      // Here a 401 means the reset token ran out (15 minutes) or was already
      // used, not bad credentials: the reset has to start again.
      throw toAuthError(e, { UNAUTHORIZED: 'expiredCode' });
    }
  },

  async refreshSession(refreshToken: string): Promise<AuthSession> {
    try {
      return toAuthSession(await authApi.refresh({ refreshToken }));
    } catch (e) {
      throw toAuthError(e, SESSION_CALL);
    }
  },

  async getAccount(accessToken: string): Promise<Account> {
    try {
      return toAccount(await authApi.getMe(accessToken));
    } catch (e) {
      throw toAuthError(e, SESSION_CALL);
    }
  },

  async getCurrentTerms(options?: { fresh?: boolean }) {
    try {
      return await authApi.getTerms(options);
    } catch (e) {
      throw toAuthError(e);
    }
  },

  async acceptTerms(accessToken: string, version: string): Promise<void> {
    try {
      await authApi.acceptTerms(accessToken, { version });
    } catch (e) {
      // 400 with `errors: [{ field: 'version' }]`: not the version in force.
      if (isTermsVersionRejection(e, 'version')) throw new AuthError('termsOutdated');
      throw toAuthError(e, SESSION_CALL);
    }
  },

  async signOut(accessToken: string): Promise<void> {
    try {
      await authApi.logout(accessToken);
    } catch (e) {
      throw toAuthError(e, SESSION_CALL);
    } finally {
      await forgetGoogleAccount();
    }
  },
});
