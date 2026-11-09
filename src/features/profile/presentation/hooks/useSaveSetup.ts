import { useMutation } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { getTimezone } from '@core/device/deviceIdentity';

import { isProfileError, type ProfileErrorCode } from '../../domain/entities/ProfileError';
import { useProfileSetup } from '../state/ProfileSetupContext';
import { setupAnswers } from '../state/setupAnswers';

/**
 * The loader after "What are you into?": a mutation that sends the whole setup
 * in one `PATCH /me` as soon as the screen mounts — city, languages, travel
 * styles, favourite destinations (Google place ids), interests, the phone's time zone, and gender, name
 * and date of birth when given. Every path through setup (Skip included) comes
 * here, and the PATCH always goes out, because an email sign-up stays
 * incomplete until its first `PATCH /me` (backend answers A1). The answer is
 * the updated profile, carrying the server's `profileCompletedAt`, so it goes
 * straight into the cached `GET /me` and no second request is needed.
 *
 * Sent once per visit; a failure stays on screen with a retry rather than
 * sending the person back through the steps.
 */
export function useSaveSetup({ onSaved }: { onSaved: () => void }) {
  const { useCases, draft, missing, setProfile } = useProfileSetup();

  const save = useMutation({
    // Never skipped, even with nothing new to say: the PATCH itself is what completes an email sign-up.
    mutationFn: () => useCases.saveSetup(setupAnswers(draft, missing, getTimezone())),
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
