import { getAppConfig } from '@core/config/appConfig';

import { sessionStorage } from './data/datasources/local/sessionStorage';
import { createAuthRepository } from './data/repositories/AuthRepositoryImpl';
import {
  makeAcceptTerms,
  makeGetCurrentTerms,
  makeResolveNextStep,
} from './domain/usecases/AccountUseCases';
import {
  makeCompleteAccountLink,
  makeIsProviderAvailable,
  makeSignInWithProvider,
} from './domain/usecases/ProviderSignInUseCases';
import { makeRequestPasswordReset } from './domain/usecases/RequestPasswordResetUseCase';
import { makeResendEmailCode } from './domain/usecases/ResendEmailCodeUseCase';
import { makeResetPassword } from './domain/usecases/ResetPasswordUseCase';
import {
  makeEndLocalSession,
  makeKeepSession,
  makeRestoreSession,
  makeSignOut,
  makeWithSession,
} from './domain/usecases/SessionUseCases';
import { makeSignIn } from './domain/usecases/SignInUseCase';
import { makeStartEmailSignUp } from './domain/usecases/StartEmailSignUpUseCase';
import { makeVerifyEmail } from './domain/usecases/VerifyEmailUseCase';

/**
 * The feature's composition root: the one place that knows which repository
 * implementation backs the use cases.
 *
 * It is the real API (`data/repositories/AuthRepositoryImpl`, over
 * `contracts/openapi/ajala-api.json`). `FixtureAuthRepository` is still here for
 * working offline — swap it in on this line and nothing above notices.
 *
 * `onSessionEnded` runs when the stored session has been cleared without the
 * person signing out — a refresh refused, or a password reset that signed every
 * device out — so the app can stop treating them as signed in.
 *
 * ONE `withSession` for everything: it holds the single in-flight refresh, and a
 * second instance would race it with the same single-use refresh token.
 */
export function createAuthUseCases({ onSessionEnded }: { onSessionEnded?: () => void } = {}) {
  const repo = createAuthRepository();
  const store = sessionStorage;
  const withSession = makeWithSession(repo, store, onSessionEnded);
  const endLocalSession = makeEndLocalSession(store, onSessionEnded);
  return {
    startEmailSignUp: makeStartEmailSignUp(repo),
    verifyEmail: makeVerifyEmail(repo),
    resendEmailCode: makeResendEmailCode(repo),
    signIn: makeSignIn(repo),
    signInWithProvider: makeSignInWithProvider(repo),
    isProviderAvailable: makeIsProviderAvailable(repo),
    completeAccountLink: makeCompleteAccountLink(repo),
    resolveNextStep: makeResolveNextStep(repo, withSession),
    getCurrentTerms: makeGetCurrentTerms(repo),
    acceptTerms: makeAcceptTerms(repo, withSession),
    requestPasswordReset: makeRequestPasswordReset(repo),
    resetPassword: makeResetPassword(repo, endLocalSession),
    restoreSession: makeRestoreSession(store),
    keepSession: makeKeepSession(store),
    signOut: makeSignOut(repo, store, withSession),
    /**
     * Fetches the app config ahead of need. Sign-up, Google and Apple all send
     * the terms version from it; fetching it at launch keeps that round trip off
     * the moment someone taps Continue. Failure is fine — they fetch it again.
     */
    warmUp: () => void getAppConfig().catch(() => undefined),
  };
}

export type AuthUseCases = ReturnType<typeof createAuthUseCases>;
