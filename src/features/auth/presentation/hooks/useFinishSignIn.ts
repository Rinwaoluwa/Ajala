import { useCallback } from 'react';

import type { AuthSession } from '../../domain/entities/AuthSession';
import type { NextStep } from '../../domain/rules/accountRules';
import { useAuthUseCases, useKeepSession } from '../state/AuthContext';

/**
 * The last step of every way in — email and password, a verified code, Google,
 * Apple, a finished account link.
 *
 * Stores the session first (the account call needs it), then asks `GET /me`
 * where the person belongs: profile setup, the terms, or the app. If the session
 * dies in between, the app is already signed out by the time this resolves, and
 * `home` lands them on the guard that sends them to sign in.
 */
export function useFinishSignIn() {
  const { resolveNextStep } = useAuthUseCases();
  const keepSession = useKeepSession();

  return useCallback(
    async (session: AuthSession): Promise<NextStep> => {
      await keepSession(session);
      try {
        return await resolveNextStep({ isNew: session.isNew });
      } catch {
        return 'home';
      }
    },
    [keepSession, resolveNextStep],
  );
}
