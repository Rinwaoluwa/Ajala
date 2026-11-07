import { createContext, useContext, type ReactNode } from 'react';

import { ApiError } from '@core/api/ApiError';
import type { ApiRequest } from '@core/api/apiClient';

/**
 * A request made as the signed-in person, for the few shared pieces that call
 * the API themselves (the bookmark on every post card).
 *
 * Shared code may not import a feature, and the session — the token, and
 * refreshing it — belongs to auth. So the signed-in area hands auth's
 * `authorizedRequest` down through this context (`app/(app)/_layout.tsx`), and
 * shared code asks for it here without knowing where it came from.
 */
export type ApiRequester = <T>(request: Omit<ApiRequest, 'accessToken'>) => Promise<T>;

/**
 * Outside the signed-in area there is no one to act for, so a call fails as an
 * expired session would: an optimistic change rolls back rather than being sent
 * without a token.
 */
const signedOut: ApiRequester = () =>
  Promise.reject(new ApiError({ code: 'UNAUTHORIZED', message: 'Not signed in.', status: 401 }));

const ApiRequesterContext = createContext<ApiRequester>(signedOut);

export function ApiRequesterProvider({ request, children }: { request: ApiRequester; children: ReactNode }) {
  return <ApiRequesterContext.Provider value={request}>{children}</ApiRequesterContext.Provider>;
}

export function useApiRequester(): ApiRequester {
  return useContext(ApiRequesterContext);
}
