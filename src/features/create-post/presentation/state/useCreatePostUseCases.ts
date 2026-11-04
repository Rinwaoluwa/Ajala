import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createPostUseCases } from '../../createPostModule';

/** The wizard's use cases, making calls as the signed-in person. */
export function useCreatePostUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createPostUseCases(request), [request]);
}
