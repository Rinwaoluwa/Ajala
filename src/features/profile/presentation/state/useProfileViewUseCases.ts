import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createProfileUseCases, createProfileViewUseCases } from '../../profileModule';

/** The profile pages' use cases, as the signed-in person. */
export function useProfileViewUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(
    () => ({
      ...createProfileViewUseCases(request),
      getMyProfile: createProfileUseCases(request).getMyProfile,
    }),
    [request],
  );
}
