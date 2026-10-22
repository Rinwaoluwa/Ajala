import { useCallback, useRef, useState } from 'react';

import { isAuthError } from '../../domain/entities/AuthError';
import { isEmailValid } from '../../domain/rules/credentialRules';
import { authErrorMessages, rateLimitedMessage, signUpFieldErrorMessages } from '../copy';
import { sortFieldErrors } from '../formErrors';
import { usePasswordResetFlow } from '../state/PasswordResetFlowContext';
import { useBackoff } from './useBackoff';

/**
 * View model for step 1 of the password reset: the email address (FRD MOB-006).
 *
 * Succeeds for any well-formed address. The screen must not say whether an account
 * exists — see the repository contract.
 *
 * The API emails a LINK, not a code, so there is no code step after this: the
 * screen confirms that mail is on its way and the link re-enters the app at the
 * new-password screen.
 *
 * `POST /auth/password/forgot` always answers 202, so the only failures here
 * are a malformed address, the network, and a 429 — which holds the button off
 * for as long as the API asked.
 */

const FIELD_BY_API_NAME = { email: 'email' } as const;

export type UseRequestPasswordResetOptions = {
  onCodeSent: () => void;
};

export function useRequestPasswordReset({ onCodeSent }: UseRequestPasswordResetOptions) {
  const { useCases, setEmail: keepEmail } = usePasswordResetFlow();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverEmailError, setServerEmailError] = useState<string | null>(null);

  const inFlight = useRef(false);
  const { waitSeconds, blocked, backOffIfLimited } = useBackoff();

  const emailError =
    serverEmailError ??
    (emailTouched && email.trim() !== '' && !isEmailValid(email) ? 'Enter a valid email address.' : null);

  const canSubmit = isEmailValid(email) && !submitting && !blocked;

  const changeEmail = useCallback((text: string) => {
    setEmail(text);
    setFormError(null);
    setServerEmailError(null);
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await useCases.requestPasswordReset(email);
      keepEmail(email);
      onCodeSent();
    } catch (e) {
      if (backOffIfLimited(e)) return;
      const { fields, rest } = sortFieldErrors(
        isAuthError(e) ? e.fieldErrors : [],
        FIELD_BY_API_NAME,
        signUpFieldErrorMessages,
      );
      setServerEmailError(fields.email ?? null);
      setFormError(
        rest.join(' ') || (fields.email ? null : authErrorMessages[isAuthError(e) ? e.code : 'unknown']),
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, email, keepEmail, onCodeSent, backOffIfLimited]);

  return {
    fields: {
      email: { onChangeText: changeEmail, onBlur: () => setEmailTouched(true), error: emailError },
    },
    canSubmit,
    submitting,
    formError: blocked ? rateLimitedMessage(waitSeconds) : formError,
    submit: () => void submit(),
  };
}
