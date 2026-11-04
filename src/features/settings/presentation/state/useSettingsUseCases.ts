import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createSettingsUseCases } from '../../settingsModule';

/** Settings' use cases, making calls as the signed-in person. */
export function useSettingsUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createSettingsUseCases(request), [request]);
}
