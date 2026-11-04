import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createChatUseCases } from '../../chatModule';

/** Messages' use cases, making calls as the signed-in person. */
export function useChatUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createChatUseCases(request), [request]);
}
