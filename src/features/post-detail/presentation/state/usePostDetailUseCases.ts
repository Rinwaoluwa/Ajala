import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createPostDetailUseCases } from '../../postDetailModule';

/** The post page's use cases, making calls as the signed-in person. */
export function usePostDetailUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createPostDetailUseCases(request), [request]);
}
