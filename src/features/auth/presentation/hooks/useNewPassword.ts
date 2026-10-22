import { useCallback, useRef, useState } from 'react';

import { isAuthError } from '../../domain/entities/AuthError';
import {
  PASSWORD_RULE_IDS,
  canSubmitNewPassword,
  checkPassword,
  isPasswordWithinLimit,
  passwordsMatch,
} from '../../domain/rules/credentialRules';
import {
  authErrorMessages,
  fieldLimitMessages,
  passwordResetCopy,
  passwordRuleLabels,
  rateLimitedMessage,
  signUpFieldErrorMessages,
} from '../copy';
import { sortFieldErrors } from '../formErrors';
import { useAuthUseCases } from '../state/AuthContext';
import { useBackoff } from './useBackoff';

/**
 * View model for the last step of the password reset: the new password (MOB-006).
 *
 * `token` comes from the link the API emailed, which re-enters the app as a deep
 * link. Without one there is nothing to spend, so the form stays disabled and
 * says so rather than failing on submit.
 *
 * The checklist and the button both read the shared rules, so they cannot
 * disagree. The mismatch complaint waits until the confirmation has been left
 * alone, so it does not accuse the user while they are still typing it.
 *
 * The API's answers (`POST /auth/password/reset`, spec §3.2): 204 signs every
 * device out — the use case drops this one's session too; 400
 * PASSWORD_BREACHED is said under the password; a 401 means the link expired or
 * was used, which only a new link fixes, so the copy says where to get one.
 */

/** `ResetPasswordDto.newPassword` is the first box. */
const FIELD_BY_API_NAME = { newPassword: 'password', password: 'password' } as const;

export type UseNewPasswordOptions = {
  /** The one-time token from the emailed link. */
  token: string | null;
  onReset: () => void;
};

export function useNewPassword({ token, onReset }: UseNewPasswordOptions) {
  const useCases = useAuthUseCases();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inFlight = useRef(false);
  const continued = useRef(false);
  const { waitSeconds, blocked, backOffIfLimited } = useBackoff();

  const checks = checkPassword(password);
  const rules = PASSWORD_RULE_IDS.map((id) => ({
    id,
    label: passwordRuleLabels[id],
    met: checks[id],
  }));

  const mismatchError =
    confirmationTouched && confirmation !== '' && !passwordsMatch(password, confirmation)
      ? passwordResetCopy.newPassword.mismatch
      : null;

  const canSubmit =
    canSubmitNewPassword(password, confirmation) && !submitting && !blocked && Boolean(token);

  const changePassword = useCallback((text: string) => {
    setPassword(text);
    setFormError(null);
    setPasswordError(null);
  }, []);

  const changeConfirmation = useCallback((text: string) => {
    setConfirmation(text);
    setFormError(null);
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current || !token) return;
    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      await useCases.resetPassword(token, password, confirmation);
      setDone(true);
    } catch (e) {
      if (backOffIfLimited(e)) return;
      const code = isAuthError(e) ? e.code : 'unknown';
      if (code === 'expiredCode') {
        setFormError(passwordResetCopy.newPassword.linkExpired);
        return;
      }
      const { fields, rest } = sortFieldErrors(
        isAuthError(e) ? e.fieldErrors : [],
        FIELD_BY_API_NAME,
        signUpFieldErrorMessages,
      );
      const onPassword =
        fields.password ?? (code === 'passwordBreached' ? authErrorMessages.passwordBreached : null);
      setPasswordError(onPassword);
      setFormError(rest.join(' ') || (onPassword ? null : authErrorMessages[code]));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, token, password, confirmation, backOffIfLimited]);

  const proceed = useCallback(() => {
    if (continued.current) return;
    continued.current = true;
    setDone(false);
    onReset();
  }, [onReset]);

  return {
    fields: {
      password: {
        onChangeText: changePassword,
        error: passwordError ?? (isPasswordWithinLimit(password) ? null : fieldLimitMessages.passwordTooLong),
      },
      confirmation: {
        onChangeText: changeConfirmation,
        onBlur: () => setConfirmationTouched(true),
        error: mismatchError,
      },
    },
    rules,
    canSubmit,
    submitting,
    formError: blocked ? rateLimitedMessage(waitSeconds) : formError,
    submit: () => void submit(),
    sheet: { isPresented: done, onContinue: proceed },
  };
}
