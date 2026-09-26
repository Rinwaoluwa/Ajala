import { useCallback, useMemo, useRef, useState } from 'react';

import { isAuthError } from '../../domain/entities/AuthError';
import {
  PASSWORD_RULE_IDS,
  canSubmitSignUp,
  checkPassword,
  isEmailValid,
  toCalendarDate,
} from '../../domain/rules/signUpRules';
import { authErrorMessages, formatDateOfBirth, passwordRuleLabels } from '../copy';
import { useSignUpFlow } from '../state/SignUpFlowContext';

/**
 * View model for "Create account", step 1 of sign-up.
 *
 * Owns the form, derives the password checklist and whether Proceed is enabled
 * from the domain rules, and starts verification. It reports success through
 * `onCodeSent` rather than navigating, so the screen does not know the route map.
 */

/** Where the date wheel starts when no date is chosen yet. A convenience, not a rule. */
const DEFAULT_PICKER_AGE = 25;

export type UseSignUpDetailsOptions = {
  onCodeSent: () => void;
};

export function useSignUpDetails({ onCodeSent }: UseSignUpDetailsOptions) {
  const { useCases, setVerification } = useSignUpFlow();

  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [password, setPassword] = useState('');

  const [emailTouched, setEmailTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Guards against a second tap landing before the first request returns.
  const inFlight = useRef(false);

  const today = useMemo(() => new Date(), []);

  const passwordChecks = checkPassword(password);
  const passwordRules = PASSWORD_RULE_IDS.map((id) => ({
    id,
    label: passwordRuleLabels[id],
    met: passwordChecks[id],
  }));

  const details = { email, fullName, dateOfBirth: dateOfBirth ?? '', password };
  const canSubmit = canSubmitSignUp(details, today) && !submitting;

  // A format error only after the user has left the field, never while typing.
  const emailFormatError =
    emailTouched && email.trim() !== '' && !isEmailValid(email) ? 'Enter a valid email address.' : null;

  const pickerValue = useMemo(() => {
    if (dateOfBirth) {
      const [y, m, d] = dateOfBirth.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date(today.getFullYear() - DEFAULT_PICKER_AGE, today.getMonth(), today.getDate());
  }, [dateOfBirth, today]);

  const changeEmail = useCallback((text: string) => {
    setEmail(text);
    setEmailError(null);
  }, []);

  const confirmDateOfBirth = useCallback((date: Date) => {
    setDateOfBirth(toCalendarDate(date));
    setPickerOpen(false);
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setFormError(null);

    try {
      const verification = await useCases.startEmailSignUp({
        email,
        fullName,
        dateOfBirth: dateOfBirth ?? '',
        password,
      });
      setVerification(verification);
      onCodeSent();
    } catch (e) {
      const code = isAuthError(e) ? e.code : 'unknown';
      if (code === 'emailTaken') setEmailError(authErrorMessages.emailTaken);
      else setFormError(authErrorMessages[code]);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, email, fullName, dateOfBirth, password, setVerification, onCodeSent]);

  return {
    fields: {
      email: { onChangeText: changeEmail, onBlur: () => setEmailTouched(true), error: emailError ?? emailFormatError },
      fullName: { onChangeText: setFullName },
      password: { onChangeText: setPassword },
      dateOfBirth: {
        value: dateOfBirth ? formatDateOfBirth(dateOfBirth) : null,
        onPress: () => setPickerOpen(true),
      },
    },
    passwordRules,
    picker: {
      isPresented: pickerOpen,
      value: pickerValue,
      maximumDate: today,
      onConfirm: confirmDateOfBirth,
      onDismiss: () => setPickerOpen(false),
    },
    canSubmit,
    submitting,
    formError,
    submit: () => void submit(),
  };
}
