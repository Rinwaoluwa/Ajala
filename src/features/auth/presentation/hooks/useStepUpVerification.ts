import { useCallback } from 'react';

import { AuthError, isAuthError } from '../../domain/entities/AuthError';
import type { NextStep } from '../../domain/rules/accountRules';
import { maskEmail } from '../copy';
import { useAuthUseCases } from '../state/AuthContext';
import { useSignInFlow } from '../state/SignInFlowContext';
import { useCodeEntry } from './useCodeEntry';
import { useFinishSignIn } from './useFinishSignIn';

/**
 * View model for the Verification screen when sign-in answered 403
 * STEP_UP_REQUIRED.
 *
 * Step-up is a RETRY of sign-in, not a separate endpoint: the same email and
 * password go back to `/auth/login` with `otpCode` attached. Once a code is in
 * play, a 401 from that call is about the CODE — the credentials already passed
 * to get here — so it is reported as one.
 *
 * "Resend code" sends the credentials again with no code, which is what makes
 * the API email a fresh one; it answers STEP_UP_REQUIRED again, and here that
 * means success.
 */

export function useStepUpVerification({ onSignedIn }: { onSignedIn: (next: NextStep) => void }) {
  const useCases = useAuthUseCases();
  const finishSignIn = useFinishSignIn();
  const { stepUp } = useSignInFlow();

  const verify = useCallback(
    async (otpCode: string) => {
      if (!stepUp) throw new AuthError('unknown');
      try {
        const session = await useCases.signIn({ ...stepUp, otpCode });
        void useCases.offerPasswordSave({ ...stepUp, moment: 'signedIn' });
        // The credentials are NOT cleared here: that would trip the screen's
        // "nothing to answer, go back" guard mid-navigation. Every next step is
        // outside the sign-in stack, and leaving it unmounts the flow that holds them.
        onSignedIn(await finishSignIn(session));
      } catch (e) {
        if (isAuthError(e) && e.code === 'invalidCredentials') throw new AuthError('invalidCode');
        throw e;
      }
    },
    [useCases, stepUp, finishSignIn, onSignedIn],
  );

  const resend = useCallback(async () => {
    if (!stepUp) throw new AuthError('unknown');
    try {
      // Without a code the API cannot sign in; it emails a new one and says so.
      onSignedIn(await finishSignIn(await useCases.signIn(stepUp)));
    } catch (e) {
      if (isAuthError(e) && e.code === 'stepUpRequired') return;
      throw e;
    }
  }, [useCases, stepUp, finishSignIn, onSignedIn]);

  const { otpRef, entry } = useCodeEntry({ verify, resend });

  return {
    otpRef,
    entry,
    maskedEmail: stepUp ? maskEmail(stepUp.email) : null,
    /** False after a restart or a deep link: there is nothing to answer, so go back. */
    hasChallenge: stepUp !== null,
  };
}
