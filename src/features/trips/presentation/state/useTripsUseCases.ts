import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createTripsUseCases } from '../../tripsModule';

/** The Trips use cases, making calls as the signed-in person. */
export function useTripsUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createTripsUseCases(request), [request]);
}
