import { useCallback, useRef, useState } from 'react';

import type { OtpInputHandle } from '@shared/components';

import { isAuthError } from '../../domain/entities/AuthError';
import { VERIFICATION_CODE_LENGTH } from '../../domain/rules/signUpRules';
import { authErrorMessages, maskEmail } from '../copy';
import { useSignUpFlow } from '../state/SignUpFlowContext';

/**
 * View model for "Verification", step 2 of sign-up.
 *
 * Collects the code, checks it, and on success raises the "Email verified!" sheet.
 * Continuing from the sheet — or swiping it away, since there is nowhere else to
 * go — reports `onVerified` exactly once.
 */

export type UseEmailVerificationOptions = {
  onVerified: () => void;
};

export function useEmailVerification({ onVerified }: UseEmailVerificationOptions) {
  const { useCases, verification } = useSignUpFlow();
  const otpRef = useRef<OtpInputHandle>(null);

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  const inFlight = useRef(false);
  const continued = useRef(false);

  const codeLength = verification?.codeLength ?? VERIFICATION_CODE_LENGTH;
  const canSubmit = code.length === codeLength && !submitting && verification !== null;

  const changeCode = useCallback((next: string) => {
    setCode(next);
    // Typing clears the last error. Emptying the boxes after a wrong code also reports
    // a change, and that must not erase the message explaining why they were emptied.
    if (next !== '') setError(null);
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current || !verification) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    // Put the keyboard away now: the success sheet would otherwise open beneath it.
    otpRef.current?.blur();

    try {
      await useCases.verifyEmail(verification.verificationId, code);
      setVerified(true);
    } catch (e) {
      const errorCode = isAuthError(e) ? e.code : 'unknown';
      setError(authErrorMessages[errorCode]);
      if (errorCode === 'invalidCode') {
        otpRef.current?.clear();
        otpRef.current?.focus();
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, verification, code]);

  const proceed = useCallback(() => {
    if (continued.current) return;
    continued.current = true;
    setVerified(false);
    onVerified();
  }, [onVerified]);

  return {
    otpRef,
    codeLength,
    maskedEmail: verification ? maskEmail(verification.email) : null,
    changeCode,
    error,
    canSubmit,
    submitting,
    submit: () => void submit(),
    sheet: { isPresented: verified, onContinue: proceed },
  };
}
