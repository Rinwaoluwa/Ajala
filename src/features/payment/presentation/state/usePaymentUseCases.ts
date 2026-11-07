import { useMemo } from 'react';

import { useAuthorizedRequest } from '@features/auth';

import { createPaymentUseCases } from '../../paymentModule';

/** The subscription's use cases, making calls as the signed-in person. */
export function usePaymentUseCases() {
  const request = useAuthorizedRequest();
  return useMemo(() => createPaymentUseCases(request), [request]);
}

/** The spec's key for `GET /me/subscription` (§7.4); cleared with the rest of the cache on sign-out. */
export const subscriptionKey = ['subscription'] as const;
