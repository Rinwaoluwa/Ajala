import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { useDebouncedValue } from '@shared/hooks/useDebouncedValue';

import type { HandleAvailability } from '../../domain/entities/Profile';
import { isProfileError } from '../../domain/entities/ProfileError';
import {
  handleFormatProblem,
  normalizeHandle,
  suggestHandles,
  type HandleFormatProblem,
} from '../../domain/rules/handleRules';
import { handleFormatMessages, handleUnavailableMessages, profileErrorMessages } from '../copy';
import { profileKeys } from '../state/profileQueries';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * View model for "Choose your display name" — the @handle (API map §3).
 *
 * As the person types: the format is checked at once, on the phone; a handle
 * that could be valid is asked about (`GET /handles/availability`, a query keyed
 * on the handle) once typing pauses for `DEBOUNCE_MS` — the endpoint allows 10 a
 * minute. Answers are cached for 30 seconds, so going back to a name already
 * checked asks nothing. The person's own current handle needs no asking.
 *
 * Suggestions come from their name; picking one fills the field.
 *
 * Continue is a mutation: `PATCH /me { handle }`, whose answer becomes the
 * cached profile. It can still be refused (someone took it a moment ago — the
 * cached check is corrected — or it was changed within 30 days), and says so.
 */

const DEBOUNCE_MS = 600;

export type HandleStatus =
  | { kind: 'empty' }
  | { kind: 'format'; problem: HandleFormatProblem }
  | { kind: 'checking' }
  | { kind: 'available' }
  | { kind: 'unavailable'; reason: 'taken' | 'reserved' | 'format' }
  | { kind: 'checkFailed' };

export function useDisplayName({ onChosen }: { onChosen: () => void }) {
  const { useCases, profile, setProfile } = useProfileSetup();
  const queryClient = useQueryClient();
  const current = profile?.handle ?? null;

  const [value, setValue] = useState(current ?? '');
  // The field owns its text; a new key re-seeds it when a suggestion is picked.
  const [fieldKey, setFieldKey] = useState(0);

  const handle = normalizeHandle(value);
  // Everything that can be known without asking.
  const local = useMemo<HandleStatus | null>(() => {
    if (handle === '') return { kind: 'empty' };
    const problem = handleFormatProblem(handle);
    if (problem) return { kind: 'format', problem };
    if (handle === current) return { kind: 'available' };
    return null;
  }, [handle, current]);

  const settled = useDebouncedValue(handle, DEBOUNCE_MS);
  const check = useQuery({
    queryKey: profileKeys.handle(settled),
    queryFn: () => useCases.checkHandle(settled),
    enabled: local === null && settled === handle,
    staleTime: 30_000,
  });

  const status: HandleStatus =
    local ??
    (settled !== handle || check.isPending
      ? { kind: 'checking' }
      : check.isError
        ? { kind: 'checkFailed' }
        : check.data?.available
          ? { kind: 'available' }
          : {
              kind: 'unavailable',
              reason: check.data && !check.data.available ? check.data.reason : 'taken',
            });

  const suggestions = useMemo(
    () => suggestHandles(profile?.firstName ?? null, profile?.lastName ?? null),
    [profile?.firstName, profile?.lastName],
  );

  const choose = useMutation({
    mutationFn: (next: string) => useCases.chooseHandle(next),
    onSuccess: (updated) => {
      setProfile(updated);
      onChosen();
    },
    onError: (e, next) => {
      if (isProfileError(e) && e.code === 'handleTaken') {
        const taken: HandleAvailability = { available: false, reason: 'taken' };
        queryClient.setQueryData(profileKeys.handle(next), taken);
      }
    },
  });

  const change = useCallback(
    (text: string) => {
      setValue(normalizeHandle(text));
      choose.reset();
    },
    [choose],
  );

  const pickSuggestion = useCallback(
    (suggestion: string) => {
      setValue(suggestion);
      choose.reset();
      setFieldKey((k) => k + 1);
    },
    [choose],
  );

  const submitError = choose.error
    ? isProfileError(choose.error) && choose.error.code === 'handleCooldown' && choose.error.availableAt
      ? `${profileErrorMessages.handleCooldown} You can change it after ${new Date(choose.error.availableAt).toLocaleDateString()}.`
      : profileErrorMessages[isProfileError(choose.error) ? choose.error.code : 'unknown']
    : null;

  const fieldError =
    submitError ??
    (status.kind === 'format'
      ? handleFormatMessages[status.problem]
      : status.kind === 'unavailable'
        ? handleUnavailableMessages[status.reason]
        : null);

  return {
    value,
    fieldKey,
    status,
    fieldError,
    suggestions,
    submitting: choose.isPending,
    canSubmit: (status.kind === 'available' || status.kind === 'checkFailed') && !choose.isPending,
    change,
    pickSuggestion,
    submit: () => (handle === current ? onChosen() : choose.mutate(handle)),
  };
}
