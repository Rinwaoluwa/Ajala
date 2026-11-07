import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createNotificationsUseCases } from '../../notificationsModule';

/** The notifications use cases, making calls as the signed-in person. */
export function useNotificationsUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createNotificationsUseCases(request), [request]);
}
