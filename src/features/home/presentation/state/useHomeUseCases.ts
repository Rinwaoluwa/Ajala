import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createHomeUseCases } from '../../homeModule';

/** The feed's use cases, making calls as the signed-in person. */
export function useHomeUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createHomeUseCases(request), [request]);
}
