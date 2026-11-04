import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';

import { isSettingsError } from '../../domain/entities/SettingsError';
import { settingsKeys } from '../state/settingsQueries';
import { useSettingsUseCases } from '../state/useSettingsUseCases';
import { errorCodeOf } from './useSettingsData';

/**
 * The sensitive account changes (spec §2.5, §2.6). Changing email and deleting
 * the account may answer 403 REAUTH_REQUIRED: the screen then asks "Confirm it's
 * you" and, once confirmed, runs the same request again (`retryAfterReauth`).
 */

export function useChangePassword() {
  const { changePassword } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) => changePassword(current, next),
    // Other devices were signed out; the device list is stale.
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: settingsKeys.sessions }),
  });
  return {
    submit: (current: string, next: string) => mutation.mutate({ current, next }),
    saving: mutation.isPending,
    done: mutation.isSuccess,
    error: errorCodeOf(mutation.error),
    reset: mutation.reset,
  };
}

/** Wraps a mutation that may need re-auth: on REAUTH_REQUIRED it holds the input until the person confirms. */
function useReauthGate<T>() {
  const [pending, setPending] = useState<T | null>(null);
  return {
    needsReauth: pending !== null,
    hold: (input: T) => setPending(input),
    take: () => {
      const input = pending;
      setPending(null);
      return input;
    },
    cancel: () => setPending(null),
  };
}

export function useChangeEmail() {
  const { startEmailChange, confirmEmailChange } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const gate = useReauthGate<string>();

  const start = useMutation({
    mutationFn: (email: string) => startEmailChange(email),
    onSuccess: (_r, email) => setSentTo(email.trim()),
    onError: (e, email) => {
      if (isSettingsError(e) && e.code === 'reauthRequired') gate.hold(email);
    },
  });
  const confirm = useMutation({
    mutationFn: (code: string) => confirmEmailChange(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.account });
      void queryClient.invalidateQueries({ queryKey: settingsKeys.sessions });
      void queryClient.invalidateQueries({ queryKey: sharedQueryKeys.me });
    },
  });

  return {
    sentTo,
    send: (email: string) => start.mutate(email),
    sending: start.isPending,
    sendError: start.error && !gate.needsReauth ? errorCodeOf(start.error) : null,
    needsReauth: gate.needsReauth,
    cancelReauth: gate.cancel,
    retryAfterReauth: () => {
      const email = gate.take();
      if (email) start.mutate(email);
    },
    confirm: (code: string) => confirm.mutate(code),
    confirming: confirm.isPending,
    confirmError: errorCodeOf(confirm.error),
    done: confirm.isSuccess,
    restart: () => {
      setSentTo(null);
      start.reset();
      confirm.reset();
    },
  };
}

export function useDeleteAccount() {
  const { deleteAccount } = useSettingsUseCases();
  const gate = useReauthGate<string>();
  const mutation = useMutation({
    mutationFn: (reason: string) => deleteAccount(reason),
    onError: (e, reason) => {
      if (isSettingsError(e) && e.code === 'reauthRequired') gate.hold(reason);
    },
  });
  return {
    submit: (reason: string) => mutation.mutate(reason),
    deleting: mutation.isPending,
    /** When the account will be erased, once scheduled. */
    purgeAt: mutation.isSuccess ? (mutation.data ?? '') : null,
    error: mutation.error && !gate.needsReauth ? errorCodeOf(mutation.error) : null,
    needsReauth: gate.needsReauth,
    cancelReauth: gate.cancel,
    retryAfterReauth: () => {
      const reason = gate.take();
      if (reason !== null) mutation.mutate(reason);
    },
  };
}
