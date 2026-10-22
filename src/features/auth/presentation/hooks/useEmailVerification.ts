import { useCallback, useRef, useState } from 'react';

import type { NextStep } from '../../domain/rules/accountRules';
import { VERIFICATION_CODE_LENGTH } from '../../domain/rules/signUpRules';
import { maskEmail } from '../copy';
import { useSignUpFlow } from '../state/SignUpFlowContext';
import { useCodeEntry } from './useCodeEntry';
import { useFinishSignIn } from './useFinishSignIn';

/**
 * View model for "Verification", step 2 of sign-up.
 *
 * A right code signs the person in (`POST /auth/otp/verify` returns a session)
 * and raises the "Email verified!" sheet. While the sheet is up, `GET /me` is
 * already being asked where they go next — so Continue can move straight on.
 * Continuing, or swiping the sheet away, reports `onVerified` exactly once.
 *
 * A wrong code raises the "Email verification failed" sheet (modal-8, error)
 * rather than a line under the boxes, as the design draws it. "Try again", or
 * swiping it away, closes it and puts the cursor back in the emptied boxes. Other
 * failures — an expired code, too many attempts, no connection — stay inline,
 * because "check your code and try again" would be the wrong advice for them.
 *
 * "Resend code" asks the API for another (`POST /auth/otp/resend`, 3 an hour).
 */

export type UseEmailVerificationOptions = {
  onVerified: (next: NextStep) => void;
};

export function useEmailVerification({ onVerified }: UseEmailVerificationOptions) {
  // Set by the sign-up form, or by sign-in for an unverified account: the address
  // and the password the verify call takes with the code.
  const { useCases, verification, setVerification } = useSignUpFlow();
  const finishSignIn = useFinishSignIn();

  const [verified, setVerified] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const nextStep = useRef<Promise<NextStep> | null>(null);
  const continued = useRef(false);

  const verify = useCallback(
    async (code: string) => {
      if (!verification) return;
      const session = await useCases.verifyEmail(verification.email, code, verification.password);
      // The password has done its job; keep the address (the sheet shows it) and drop it.
      setVerification({ email: verification.email, codeLength: verification.codeLength });
      // Started now, awaited on Continue: the sheet's display time hides the round trip.
      nextStep.current = finishSignIn(session);
      setVerified(true);
    },
    [useCases, verification, setVerification, finishSignIn],
  );

  const resend = useCallback(async () => {
    if (verification) await useCases.resendEmailCode(verification.email);
  }, [useCases, verification]);

  const reportWrongCode = useCallback(() => setRejected(true), []);

  const { otpRef, entry } = useCodeEntry({
    verify,
    resend,
    onWrongCode: reportWrongCode,
    length: verification?.codeLength ?? VERIFICATION_CODE_LENGTH,
  });

  const tryAgain = useCallback(() => {
    setRejected(false);
    otpRef.current?.focus();
  }, [otpRef]);

  const proceed = useCallback(async () => {
    if (continued.current) return;
    continued.current = true;
    // Usually already answered while the sheet was up; the spinner covers the rest.
    setContinuing(true);
    const next = (await nextStep.current) ?? 'completeProfile';
    setVerified(false);
    onVerified(next);
  }, [onVerified]);

  return {
    otpRef,
    entry: { ...entry, canSubmit: entry.canSubmit && verification !== null },
    maskedEmail: verification ? maskEmail(verification.email) : null,
    sheet: { isPresented: verified, continuing, onContinue: () => void proceed() },
    failedSheet: { isPresented: rejected, onTryAgain: tryAgain },
  };
}
