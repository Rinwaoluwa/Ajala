import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createExploreUseCases } from '../../exploreModule';

/** Explore's use cases, making calls as the signed-in person. */
export function useExploreUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createExploreUseCases(request), [request]);
}
