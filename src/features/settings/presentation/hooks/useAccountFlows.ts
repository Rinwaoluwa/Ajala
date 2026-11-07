import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';
import { useSignOut } from '@features/auth';

import type { Account, DataExport, LinkedProvider, ReauthProof } from '../../domain/entities/Settings';
import { isSettingsError } from '../../domain/entities/SettingsError';
import { canRequestExport, hasPassword } from '../../domain/rules/settingsRules';
import { settingsKeys } from '../state/settingsQueries';
import { useSettingsUseCases } from '../state/useSettingsUseCases';
import { errorCodeOf, useAccount } from './useSettingsData';

/**
 * The sensitive account changes (spec §2.5, §2.6). Changing email, setting a
 * first password, unlinking Google or Apple, exporting data and deleting the
 * account may answer 403 REAUTH_REQUIRED: the screen then asks "Confirm it's
 * you" and, once confirmed, runs the same request again (`retryAfterReauth`).
 */

const isReauth = (e: unknown) => isSettingsError(e) && e.code === 'reauthRequired';

/**
 * "Confirm it's you" (spec §2.5). An account with a password types it; a
 * Google- or Apple-only account has none, so a code is emailed
 * (`POST /me/reauth/code`) and typed instead. Either opens a five-minute window.
 */
export function useReauth() {
  const { sendReauthCode, reauthenticate } = useSettingsUseCases();
  const account = useAccount();
  // Until the account has loaded, ask for the password: most accounts have one,
  // and the dialog only opens after a sensitive call, by which time it has.
  const mode: 'password' | 'code' = account.data && !hasPassword(account.data) ? 'code' : 'password';
  const send = useMutation({ mutationFn: () => sendReauthCode() });
  const confirm = useMutation({ mutationFn: (proof: ReauthProof) => reauthenticate(proof) });
  return {
    mode,
    email: account.data?.email ?? null,
    sendCode: () => send.mutate(),
    sending: send.isPending,
    codeSent: send.isSuccess,
    sendError: errorCodeOf(send.error),
    confirm: (proof: ReauthProof, onConfirmed: () => void) =>
      confirm.mutate(proof, { onSuccess: onConfirmed }),
    confirming: confirm.isPending,
    confirmError: errorCodeOf(confirm.error),
    reset: () => {
      send.reset();
      confirm.reset();
    },
    clearError: confirm.reset,
  };
}

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

/**
 * Set a first password (`POST /me/password/set`), for a Google- or Apple-only
 * account. Afterwards the account has an email identity, so Settings rereads it.
 */
export function useSetPassword() {
  const { setPassword } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const gate = useReauthGate<string>();
  const mutation = useMutation({
    mutationFn: (next: string) => setPassword(next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.account });
      void queryClient.invalidateQueries({ queryKey: sharedQueryKeys.me });
    },
    onError: (e, next) => {
      if (isReauth(e)) gate.hold(next);
    },
  });
  return {
    submit: (next: string) => mutation.mutate(next),
    saving: mutation.isPending,
    done: mutation.isSuccess,
    error: mutation.error && !gate.needsReauth ? errorCodeOf(mutation.error) : null,
    reset: mutation.reset,
    needsReauth: gate.needsReauth,
    cancelReauth: gate.cancel,
    retryAfterReauth: () => {
      const next = gate.take();
      if (next) mutation.mutate(next);
    },
  };
}

/**
 * Unlink Google or Apple (`DELETE /me/identities/{provider}`). The last way in
 * cannot go (409 LAST_SIGN_IN_METHOD); the screen offers "Set a password" then.
 */
export function useUnlinkIdentity() {
  const { unlinkIdentity } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const gate = useReauthGate<LinkedProvider>();
  const mutation = useMutation({
    mutationFn: (provider: LinkedProvider) => unlinkIdentity(provider),
    onSuccess: (_r, provider) => {
      queryClient.setQueryData<Account>(settingsKeys.account, (a) =>
        a ? { ...a, identities: a.identities.filter((i) => i.provider !== provider) } : a,
      );
      void queryClient.invalidateQueries({ queryKey: sharedQueryKeys.me });
    },
    onError: (e, provider) => {
      if (isReauth(e)) gate.hold(provider);
    },
  });
  return {
    unlink: (provider: LinkedProvider) => mutation.mutate(provider),
    unlinking: mutation.isPending ? (mutation.variables ?? null) : null,
    unlinked: mutation.isSuccess ? (mutation.variables ?? null) : null,
    error: mutation.error && !gate.needsReauth ? errorCodeOf(mutation.error) : null,
    dismissError: mutation.reset,
    needsReauth: gate.needsReauth,
    cancelReauth: gate.cancel,
    retryAfterReauth: () => {
      const provider = gate.take();
      if (provider) mutation.mutate(provider);
    },
  };
}

/**
 * Download my data (spec §2.6): the latest export (`GET /me/export`) and asking
 * for a new one (`POST /me/export`). Both may need re-auth. Reading it is
 * gated too: when the read answers REAUTH_REQUIRED the screen offers to
 * confirm, then reads again.
 */
export function useDataExport() {
  const { getExport, requestExport } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const current = useQuery({ queryKey: settingsKeys.dataExport, queryFn: getExport });
  const gate = useReauthGate<'read' | 'request'>();
  const request = useMutation({
    mutationFn: () => requestExport(),
    onSuccess: (next) => queryClient.setQueryData<DataExport | null>(settingsKeys.dataExport, next),
    onError: (e) => {
      if (isReauth(e)) gate.hold('request');
    },
  });
  const readNeedsReauth = isReauth(current.error);
  const latest = current.data ?? null;
  return {
    latest,
    loading: current.isPending,
    /** The read failed for a reason other than re-auth. */
    failed: current.isError && !readNeedsReauth,
    readNeedsReauth,
    retry: () => void current.refetch(),
    confirmToRead: () => gate.hold('read'),
    canRequest: canRequestExport(latest) && !request.isPending,
    request: () => request.mutate(),
    requesting: request.isPending,
    requestError: request.error && !gate.needsReauth ? errorCodeOf(request.error) : null,
    needsReauth: gate.needsReauth,
    cancelReauth: gate.cancel,
    retryAfterReauth: () => {
      const what = gate.take();
      if (what === 'request') request.mutate();
      else if (what === 'read') void current.refetch();
    },
  };
}

/**
 * Sign out everywhere (`POST /auth/logout/all`), then this phone signs out the
 * way Log out does (auth's `useSignOut`: clears the keychain and every cache).
 * The server has already ended this session, so auth's own logout call after it
 * fails quietly; it never blocks the local sign-out.
 */
export function useSignOutEverywhere() {
  const { signOutEverywhere } = useSettingsUseCases();
  const signOut = useSignOut();
  const mutation = useMutation({ mutationFn: () => signOutEverywhere(), onSuccess: () => void signOut() });
  return {
    submit: () => mutation.mutate(),
    busy: mutation.isPending || mutation.isSuccess,
    error: errorCodeOf(mutation.error),
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
      if (isReauth(e)) gate.hold(email);
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
      if (isReauth(e)) gate.hold(reason);
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
