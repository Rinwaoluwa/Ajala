import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { sharedQueryKeys } from '@core/api/queryClient/queryClient';

import type { Account, SettingsPatch, UserSettings } from '../../domain/entities/Settings';
import { isSettingsError, type SettingsErrorCode } from '../../domain/entities/SettingsError';
import { settingsKeys } from '../state/settingsQueries';
import { useSettingsUseCases } from '../state/useSettingsUseCases';

/**
 * The Settings screens' reads and their simple writes, as TanStack queries and
 * mutations. Each read is cached a minute (the app's default); returning to a
 * screen draws at once and refreshes behind.
 */

export const errorCodeOf = (e: unknown): SettingsErrorCode | null =>
  e ? (isSettingsError(e) ? e.code : 'unknown') : null;

/** The signed-in account (`GET /me`), in Settings' shape. */
export function useAccount() {
  const { getAccount } = useSettingsUseCases();
  return useQuery({ queryKey: settingsKeys.account, queryFn: getAccount });
}

/** After the account changed: Settings' copy is replaced, every other reader of `/me` refetches. */
export function useAccountChanged() {
  const queryClient = useQueryClient();
  return (account: Account) => {
    queryClient.setQueryData(settingsKeys.account, account);
    void queryClient.invalidateQueries({ queryKey: sharedQueryKeys.me });
  };
}

/**
 * Stored preferences (`GET /me/settings`), changed optimistically (spec §2.15):
 * a switch moves at once and moves back if the server says no.
 */
export function usePreferences() {
  const { getSettings, updateSettings } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.preferences, queryFn: getSettings });

  const mutation = useMutation({
    mutationFn: (patch: SettingsPatch) => updateSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: settingsKeys.preferences });
      const before = queryClient.getQueryData<UserSettings>(settingsKeys.preferences);
      if (before) queryClient.setQueryData<UserSettings>(settingsKeys.preferences, { ...before, ...patch });
      return { before };
    },
    onError: (_e, _patch, context) => {
      if (context?.before) queryClient.setQueryData(settingsKeys.preferences, context.before);
    },
    onSuccess: (next) => queryClient.setQueryData(settingsKeys.preferences, next),
  });

  return {
    settings: query.data ?? null,
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    update: (patch: SettingsPatch) => mutation.mutate(patch),
    error: errorCodeOf(mutation.error),
  };
}

/** Drafts (`GET /me/posts?status=draft`), newest first; delete with `DELETE /posts/:id`. */
export function useDrafts() {
  const { listDrafts, deleteDraft } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.drafts, queryFn: listDrafts });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDraft(id),
    onSuccess: (_r, id) =>
      queryClient.setQueryData(settingsKeys.drafts, (list: { id: string }[] | undefined) =>
        list?.filter((d) => d.id !== id),
      ),
  });
  return {
    drafts: query.data ?? null,
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    refresh: () => void query.refetch(),
    remove: (id: string) => remove.mutateAsync(id),
    removing: remove.isPending ? (remove.variables ?? null) : null,
  };
}

/** Signed-in devices; signing one out removes it from the list. */
export function useSessions() {
  const { listSessions, endSession } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.sessions, queryFn: listSessions });
  const end = useMutation({
    mutationFn: (id: string) => endSession(id),
    onSuccess: (_r, id) =>
      queryClient.setQueryData(settingsKeys.sessions, (list: { id: string }[] | undefined) =>
        list?.filter((s) => s.id !== id),
      ),
  });
  return {
    sessions: query.data ?? null,
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    end: (id: string) => end.mutate(id),
    ending: end.isPending ? (end.variables ?? null) : null,
    error: errorCodeOf(end.error),
  };
}

/** People the person blocked; unblocking removes them from the list. */
export function useBlocked() {
  const { listBlocked, unblock } = useSettingsUseCases();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: settingsKeys.blocked, queryFn: listBlocked });
  const mutation = useMutation({
    mutationFn: (id: string) => unblock(id),
    onSuccess: (_r, id) => {
      queryClient.setQueryData(settingsKeys.blocked, (list: { id: string }[] | undefined) =>
        list?.filter((b) => b.id !== id),
      );
      // Their posts and profile can appear again elsewhere.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
  return {
    blocked: query.data ?? null,
    loading: query.isPending,
    failed: query.isError,
    retry: () => void query.refetch(),
    unblock: (id: string) => mutation.mutate(id),
    unblocking: mutation.isPending ? (mutation.variables ?? null) : null,
    error: errorCodeOf(mutation.error),
  };
}

/** Help, About and the policy links (`GET /app/config`), cached for the session. */
export function useSupportLinks() {
  const { getSupportLinks } = useSettingsUseCases();
  return useQuery({ queryKey: settingsKeys.support, queryFn: getSupportLinks, staleTime: 5 * 60_000 });
}
