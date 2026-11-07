import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { ProfileError, isProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import { useProfileSetup } from '../state/ProfileSetupContext';

/**
 * The loader after "What are you into?": a mutation that sends the whole setup
 * in one `PATCH /me` as soon as the screen mounts — city, languages, travel
 * styles, favourite cities, interests, and gender, name and date of birth when
 * given. The answer is the updated profile, carrying the server's
 * `profileCompletedAt`, so it goes straight into the cached `GET /me` and no
 * second request is needed.
 *
 * Sent once per visit; a failure stays on screen with a retry rather than
 * sending the person back through the steps.
 */
export function useSaveSetup({ onSaved }: { onSaved: () => void }) {
  const { useCases, draft, missing, setProfile } = useProfileSetup();

  const save = useMutation({
    mutationFn: () =>
      // Reached only through the steps, which require a city; a deep link could skip them.
      draft.homeCity
        ? useCases.saveSetup({
            homeCityId: draft.homeCity.id,
            languages: draft.languages,
            gender: draft.gender,
            travelStyles: draft.travelStyles,
            favouriteCityIds: draft.destinations.map((c) => c.id),
            fullName: missing.name ? draft.fullName : undefined,
            dateOfBirth: missing.dateOfBirth ? (draft.dateOfBirth ?? undefined) : undefined,
            interestIds: draft.skippedInterests ? undefined : draft.interestIds,
          })
        : Promise.reject(new ProfileError('invalidDetails')),
    onSuccess: (profile) => {
      setProfile(profile);
      onSaved();
    },
  });

  const sent = useRef(false);
  const { mutate } = save;
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    mutate();
  }, [mutate]);

  const error: ProfileErrorCode | null = save.error
    ? isProfileError(save.error)
      ? save.error.code
      : 'unknown'
    : null;

  return { error, retry: () => mutate() };
}
