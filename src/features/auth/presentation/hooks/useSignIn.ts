import { useCallback, useMemo, useRef, useState } from 'react';

import { isAuthError } from '../../domain/entities/AuthError';
import type { NextStep } from '../../domain/rules/accountRules';
import {
  VERIFICATION_CODE_LENGTH,
  canSubmitSignIn,
  isEmailValid,
  normalizeEmail,
} from '../../domain/rules/credentialRules';
import { authErrorMessages, rateLimitedMessage, signUpFieldErrorMessages } from '../copy';
import { sortFieldErrors } from '../formErrors';
import { useAuthUseCases } from '../state/AuthContext';
import { useSignInFlow } from '../state/SignInFlowContext';
import { useSignUpFlow } from '../state/SignUpFlowContext';
import { useBackoff } from './useBackoff';
import { useFinishSignIn } from './useFinishSignIn';
import { haptics } from '@shared/feedback/haptics';

/**
 * View model for the Sign In form (FRD MOB-005, `POST /auth/login`).
 *
 * Reports outcomes through callbacks rather than navigating, so the screen does
 * not know the route map:
 *   - `onSignedIn` with where `GET /me` says to go next,
 *   - `onNeedsVerification` when the address was never confirmed (403
 *     EMAIL_NOT_VERIFIED: the API has just re-sent a code); the address is
 *     already handed to the sign-up flow for the verify screen. NOT the
 *     password: the spec is explicit that none is needed here, "because the
 *     account already exists" (§2.2) — it is only sent to complete a sign-up,
 *     from the sign-up form,
 *   - `onStepUpRequired` when the sign-in looked unusual and the API emailed a
 *     code. The credentials are parked in the sign-in flow, in memory, for the
 *     Verification screen to send back with that code.
 *
 * A wrong password and a locked account both answer 401, and the message stays
 * "wrong email or password" for both, as the API intends. A 429 holds the button
 * off for as long as the API asked (`useBackoff`).
 */

/** `LoginDto` fields this form shows. The password's complaint goes to the form, not the box. */
const FIELD_BY_API_NAME = { email: 'email' } as const;

export type UseSignInOptions = {
  onSignedIn: (next: NextStep) => void;
  /** The pending verification (the address) is already in the sign-up flow. */
  onNeedsVerification: () => void;
  onStepUpRequired: () => void;
};

export function useSignIn({ onSignedIn, onNeedsVerification, onStepUpRequired }: UseSignInOptions) {
  const useCases = useAuthUseCases();
  const finishSignIn = useFinishSignIn();
  const { setStepUp } = useSignInFlow();
  const { setVerification } = useSignUpFlow();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverEmailError, setServerEmailError] = useState<string | null>(null);

  // Guards against a second tap landing before the first request returns.
  const inFlight = useRef(false);
  const { waitSeconds, blocked, backOffIfLimited } = useBackoff();

  // A format complaint only after the user has left the field, never while typing.
  const emailError =
    serverEmailError ??
    (emailTouched && email.trim() !== '' && !isEmailValid(email) ? 'Enter a valid email address.' : null);

  const canSubmit = canSubmitSignIn(email, password) && !submitting && !blocked;

  const changeEmail = useCallback((text: string) => {
    setEmail(text);
    setFormError(null);
    setServerEmailError(null);
  }, []);

  const changePassword = useCallback((text: string) => {
    setPassword(text);
    setFormError(null);
  }, []);

  const blurEmail = useCallback(() => setEmailTouched(true), []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      const session = await useCases.signIn({ email, password });
      // Not awaited: the manager's prompt (Android) rides over the next screen.
      void useCases.offerPasswordSave({ email, password, moment: 'signedIn' });
      // A login answers with tokens only (`TokenPairDto`); `finishSignIn` asks
      // `GET /me` who this is and where they go.
      onSignedIn(await finishSignIn(session));
    } catch (e) {
      if (backOffIfLimited(e)) return;
      const code = isAuthError(e) ? e.code : 'unknown';
      if (code === 'emailNotVerified') {
        // The account exists, so the code alone verifies it: no password.
        setVerification({ email: normalizeEmail(email), codeLength: VERIFICATION_CODE_LENGTH });
        onNeedsVerification();
        return;
      }
      if (code === 'stepUpRequired') {
        // Held in memory for the retry with `otpCode`, never put in the route.
        setStepUp({ email, password });
        onStepUpRequired();
        return;
      }
      const { fields, rest } = sortFieldErrors(
        isAuthError(e) ? e.fieldErrors : [],
        FIELD_BY_API_NAME,
        signUpFieldErrorMessages,
      );
      setServerEmailError(fields.email ?? null);
      // Felt only when something is said (not on the way to verifying an email).
      haptics.error();
      setFormError(fields.email && rest.length === 0 ? null : authErrorMessages[code]);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [
    useCases,
    finishSignIn,
    email,
    password,
    setStepUp,
    setVerification,
    onSignedIn,
    onNeedsVerification,
    onStepUpRequired,
    backOffIfLimited,
  ]);

  const fields = useMemo(
    () => ({
      email: { onChangeText: changeEmail, onBlur: blurEmail, error: emailError },
      password: { onChangeText: changePassword },
    }),
    [changeEmail, blurEmail, emailError, changePassword],
  );

  return {
    fields,
    canSubmit,
    submitting,
    formError: blocked ? rateLimitedMessage(waitSeconds) : formError,
    submit: useCallback(() => void submit(), [submit]),
  };
}
