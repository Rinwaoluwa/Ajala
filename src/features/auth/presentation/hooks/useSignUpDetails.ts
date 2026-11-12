import { useCallback, useMemo, useRef, useState } from 'react';

import { isOldEnough } from '@shared/utils/age';

import { isAuthError } from '../../domain/entities/AuthError';
import {
  PASSWORD_RULE_IDS,
  canSubmitSignUp,
  checkPassword,
  fullNameProblem,
  isEmailValid,
  isPasswordWithinLimit,
  toCalendarDate,
} from '../../domain/rules/signUpRules';
import {
  authErrorMessages,
  fieldLimitMessages,
  formatDateOfBirth,
  passwordRuleLabels,
  rateLimitedMessage,
  signUpFieldErrorMessages,
  underAgeMessage,
} from '../copy';
import { sortFieldErrors } from '../formErrors';
import { useSignUpFlow } from '../state/SignUpFlowContext';
import { useBackoff } from './useBackoff';

/**
 * View model for "Create account", step 1 of sign-up.
 *
 * Owns the form, derives the password checklist and whether Continue is enabled
 * from the domain rules, and starts verification. It reports success through
 * `onCodeSent` rather than navigating, so the screen does not know the route map.
 *
 * Everything handed back is memoised and every callback is stable. Each field and
 * each rule row owns a native Expo UI view, so an unstable prop re-renders real
 * native views on every keystroke — which is what made typing and the Continue
 * button feel sluggish.
 */

/** Where the date wheel starts when no date is chosen yet. A convenience, not a rule. */
const DEFAULT_PICKER_AGE = 25;

/** `YYYY-MM-DD` to a local Date. Month is 1-based in the string, 0-based in Date. */
function parseCalendarDate(calendarDate: string): Date {
  const [year, month, day] = calendarDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * The form input each `SignupEmailDto` field belongs to, so a VALIDATION_FAILED
 * complaint lands on it (spec §5).
 */
const FIELD_BY_API_NAME = {
  email: 'email',
  password: 'password',
  firstName: 'fullName',
  lastName: 'fullName',
  dob: 'dateOfBirth',
} as const;

type FormField = (typeof FIELD_BY_API_NAME)[keyof typeof FIELD_BY_API_NAME];
type FieldErrors = Partial<Record<FormField, string>>;

const NO_FIELD_ERRORS: FieldErrors = {};

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
  const [nameTouched, setNameTouched] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldErrors>(NO_FIELD_ERRORS);
  const [formError, setFormError] = useState<string | null>(null);

  // Guards against a second tap landing before the first request returns.
  const inFlight = useRef(false);
  const { waitSeconds, blocked, backOffIfLimited } = useBackoff();

  const today = useMemo(() => new Date(), []);

  const passwordRules = useMemo(() => {
    const checks = checkPassword(password);
    return PASSWORD_RULE_IDS.map((id) => ({ id, label: passwordRuleLabels[id], met: checks[id] }));
  }, [password]);

  const canSubmit = useMemo(
    () =>
      canSubmitSignUp({ email, fullName, dateOfBirth: dateOfBirth ?? '', password }, today) &&
      !submitting &&
      !blocked,
    [email, fullName, dateOfBirth, password, today, submitting, blocked],
  );

  // Format complaints wait until the field has been left, so nobody is corrected
  // halfway through typing.
  const emailFormatError =
    emailTouched && email.trim() !== '' && !isEmailValid(email) ? 'Enter a valid email address.' : null;
  const nameProblem = nameTouched && fullName.trim() !== '' ? fullNameProblem(fullName) : null;
  const nameFormatError =
    nameProblem === 'tooLong'
      ? fieldLimitMessages.nameTooLong
      : nameProblem === 'incomplete'
        ? 'Enter your first and last name.'
        : null;
  // Said straight away: unlike a half-typed address, an over-long password does
  // not become right by typing more.
  const passwordLimitError = isPasswordWithinLimit(password) ? null : fieldLimitMessages.passwordTooLong;

  const clearServerErrors = useCallback(() => {
    setServerFieldErrors((current) => (current === NO_FIELD_ERRORS ? current : NO_FIELD_ERRORS));
    setFormError((current) => (current === null ? current : null));
  }, []);

  const changeEmail = useCallback(
    (text: string) => {
      setEmail(text);
      clearServerErrors();
    },
    [clearServerErrors],
  );

  const changeFullName = useCallback(
    (text: string) => {
      setFullName(text);
      clearServerErrors();
    },
    [clearServerErrors],
  );

  const changePassword = useCallback(
    (text: string) => {
      setPassword(text);
      clearServerErrors();
    },
    [clearServerErrors],
  );

  const blurEmail = useCallback(() => setEmailTouched(true), []);
  const blurName = useCallback(() => setNameTouched(true), []);
  const openPicker = useCallback(() => setPickerOpen(true), []);
  const closePicker = useCallback(() => setPickerOpen(false), []);

  const confirmDateOfBirth = useCallback((date: Date) => {
    setDateOfBirth(toCalendarDate(date));
    setPickerOpen(false);
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setServerFieldErrors(NO_FIELD_ERRORS);
    setFormError(null);

    try {
      const pending = await useCases.startEmailSignUp({
        email,
        fullName,
        dateOfBirth: dateOfBirth ?? '',
        password,
      });
      // The verify call must send this password with the code — the API requires
      // it to complete a sign-up (spec §2.2). It stays in memory only.
      setVerification({ ...pending, password });
      onCodeSent();
    } catch (e) {
      if (backOffIfLimited(e)) return;
      const code = isAuthError(e) ? e.code : 'unknown';
      const { fields, rest } = sortFieldErrors(
        isAuthError(e) ? e.fieldErrors : [],
        FIELD_BY_API_NAME,
        signUpFieldErrorMessages,
      );

      // A breached password is about the password, so it is said under it (§5: "inline").
      if (code === 'passwordBreached') fields.password ??= authErrorMessages.passwordBreached;
      setServerFieldErrors(fields);

      // Only speak for the form as a whole when nothing landed on a field —
      // otherwise the inputs already say what is wrong.
      const hasFieldError = Object.keys(fields).length > 0;
      setFormError(rest.join(' ') || (hasFieldError ? null : authErrorMessages[code]));
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, email, fullName, dateOfBirth, password, setVerification, onCodeSent, backOffIfLimited]);

  const fields = useMemo(
    () => ({
      email: {
        onChangeText: changeEmail,
        onBlur: blurEmail,
        error: serverFieldErrors.email ?? emailFormatError,
      },
      fullName: {
        onChangeText: changeFullName,
        onBlur: blurName,
        error: serverFieldErrors.fullName ?? nameFormatError,
      },
      password: {
        onChangeText: changePassword,
        error: serverFieldErrors.password ?? passwordLimitError,
      },
      dateOfBirth: {
        value: dateOfBirth ? formatDateOfBirth(dateOfBirth) : null,
        onPress: openPicker,
        // Ajala is 18 and over: the date is refused here, before anything is sent.
        error:
          serverFieldErrors.dateOfBirth ??
          (dateOfBirth && !isOldEnough(dateOfBirth, today) ? underAgeMessage : null),
      },
    }),
    [
      changeEmail,
      changeFullName,
      changePassword,
      blurEmail,
      blurName,
      openPicker,
      dateOfBirth,
      today,
      serverFieldErrors,
      emailFormatError,
      nameFormatError,
      passwordLimitError,
    ],
  );

  const picker = useMemo(
    () => ({
      isPresented: pickerOpen,
      value: dateOfBirth
        ? parseCalendarDate(dateOfBirth)
        : new Date(today.getFullYear() - DEFAULT_PICKER_AGE, today.getMonth(), today.getDate()),
      maximumDate: today,
      onConfirm: confirmDateOfBirth,
      onDismiss: closePicker,
    }),
    [pickerOpen, dateOfBirth, today, confirmDateOfBirth, closePicker],
  );

  const runSubmit = useCallback(() => void submit(), [submit]);

  return {
    fields,
    passwordRules,
    picker,
    canSubmit,
    submitting,
    formError: blocked ? rateLimitedMessage(waitSeconds) : formError,
    submit: runSubmit,
  };
}
