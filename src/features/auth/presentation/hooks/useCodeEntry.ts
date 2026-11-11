import { useCallback, useMemo, useRef, useState } from 'react';

import { haptics } from '@shared/feedback/haptics';
import type { OtpInputHandle } from '@shared/components';
import { useCountdown } from '@shared/hooks/useCountdown';

import { isAuthError } from '../../domain/entities/AuthError';
import {
  RESEND_COOLDOWN_SECONDS,
  VERIFICATION_CODE_LENGTH,
} from '../../domain/rules/credentialRules';
import { authErrorMessages, resendLimitedMessage, resendSentMessage } from '../copy';

/**
 * The part every six-digit-code screen shares: collect the digits, submit once,
 * explain a failure, and optionally send another code.
 *
 * Used by sign-up verification, sign-in step-up, Google/Apple account linking and
 * the password-reset code.
 * Each passes `verify`, which does the screen's own call and throws an
 * `AuthError` on failure; this hook owns everything else.
 *
 * A WRONG CODE is explained under the boxes, unless the screen passes
 * `onWrongCode`: then the boxes are emptied and the screen reports it its own way
 * (sign-up raises the "Email verification failed" sheet). Only the wrong code is
 * handed over. An expired code, a rate limit or a dropped connection each need a
 * different next step than "try again", so they stay inline with their own words.
 *
 * RESENDING is on a countdown. A code has just been sent when the screen opens,
 * so "Resend code" waits `RESEND_COOLDOWN_SECONDS` first, and again after every
 * resend — the API rate-limits sooner requests. The countdown starts the moment
 * the link is tapped, so there is no "sending…" state to wait through; if the
 * request then fails it is called off (or, when the API says to wait, set to the
 * wait it gave).
 */

const secondsFromNow = (seconds: number) => Date.now() + seconds * 1000;

export type UseCodeEntryOptions = {
  verify: (code: string) => Promise<void>;
  /** Asks for a new code. Omit where the flow cannot send one. */
  resend?: () => Promise<void>;
  /** Reports a wrong code instead of showing it under the boxes. */
  onWrongCode?: () => void;
  length?: number;
};

export function useCodeEntry({
  verify,
  resend,
  onWrongCode,
  length = VERIFICATION_CODE_LENGTH,
}: UseCodeEntryOptions) {
  const otpRef = useRef<OtpInputHandle>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  // When another code may be asked for. A code was just sent as this screen opened.
  const [resendAt, setResendAt] = useState<number | null>(() =>
    resend ? secondsFromNow(RESEND_COOLDOWN_SECONDS) : null,
  );
  const resendIn = useCountdown(resendAt);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Guards against a second tap landing before the first request returns.
  const inFlight = useRef(false);

  const messageFor = useCallback((e: unknown) => {
    const errorCode = isAuthError(e) ? e.code : 'unknown';
    return { errorCode, message: authErrorMessages[errorCode] };
  }, []);

  const changeCode = useCallback((next: string) => {
    setCode(next);
    // Typing clears the last error. Emptying the boxes after a wrong code also reports
    // a change, and that must not erase the message explaining why they were emptied.
    if (next !== '') {
      setError(null);
      setNotice(null);
    }
  }, []);

  const submit = useCallback(async () => {
    if (inFlight.current || code.length !== length) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    // Put the keyboard away now: a success sheet would otherwise open beneath it.
    otpRef.current?.blur();

    try {
      await verify(code);
    } catch (e) {
      const { errorCode, message } = messageFor(e);
      // A wrong or expired code: felt as well as seen.
      haptics.error();
      if (errorCode === 'invalidCode' && onWrongCode) {
        // Emptied now, focused when the report is dismissed: the keyboard would
        // otherwise come up over the sheet.
        otpRef.current?.clear();
        onWrongCode();
        return;
      }
      setError(message);
      if (errorCode === 'invalidCode' || errorCode === 'expiredCode') {
        otpRef.current?.clear();
        otpRef.current?.focus();
      } else if (errorCode === 'codeUsedUp') {
        // No digits will work now, so the keyboard stays down: the way on is
        // "Resend code", and a resend focuses the boxes itself.
        otpRef.current?.clear();
      }
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [code, length, verify, messageFor, onWrongCode]);

  const runResend = useCallback(async () => {
    if (!resend || inFlight.current || resendIn > 0) return;
    inFlight.current = true;
    setResending(true);
    setError(null);
    setNotice(null);
    // Counting down from the tap itself, not from when the answer arrives.
    setResendAt(secondsFromNow(RESEND_COOLDOWN_SECONDS));
    try {
      await resend();
      otpRef.current?.clear();
      otpRef.current?.focus();
      setNotice(resendSentMessage);
    } catch (e) {
      const { errorCode, message } = messageFor(e);
      if (errorCode === 'rateLimited') {
        // Wait as long as the API asked, or a full cooldown when it did not say.
        const wait = isAuthError(e) ? e.retryAfterSeconds : null;
        setResendAt(secondsFromNow(Math.max(wait ?? 0, RESEND_COOLDOWN_SECONDS)));
        setError(resendLimitedMessage);
      } else {
        // Nothing was sent, so there is nothing to wait for: offer it again now.
        setResendAt(null);
        setError(message);
      }
    } finally {
      inFlight.current = false;
      setResending(false);
    }
  }, [resend, resendIn, messageFor]);

  const onSubmit = useCallback(() => void submit(), [submit]);
  const onResend = useCallback(() => void runResend(), [runResend]);
  const resendAction = useMemo(
    // `availableIn` is whole seconds until the link works again; 0 means now.
    () => (resend ? { onPress: onResend, availableIn: resendIn } : null),
    [resend, onResend, resendIn],
  );

  const state = {
    length,
    changeCode,
    error,
    notice,
    canSubmit: code.length === length && !submitting && !resending,
    submitting,
    submit: onSubmit,
    resend: resendAction,
  };

  /** The boxes' handle, for the form to attach; everything else is render state. */
  return { otpRef, entry: state };
}

export type CodeEntryState = ReturnType<typeof useCodeEntry>['entry'];
