import { useCallback } from 'react';

import type { NextStep } from '../../domain/rules/accountRules';
import { useAuthUseCases } from '../state/AuthContext';
import { useCodeEntry } from './useCodeEntry';
import { useFinishSignIn } from './useFinishSignIn';

/**
 * View model for the Verification screen when Google or Apple matched an
 * existing account (409 ACCOUNT_LINK_REQUIRED).
 *
 * The API emailed a code to the account that already owns the address; entering
 * it proves the person owns that account too, attaches the provider to it, and
 * signs them in (`POST /auth/oauth/link`).
 *
 * There is no "resend": the challenge is one-use and lasts 10 minutes. A failed
 * code ends it, and the way to a new one is to tap Google or Apple again, which
 * is what the error says.
 */
export function useAccountLink({
  challengeId,
  onSignedIn,
}: {
  challengeId: string | null;
  onSignedIn: (next: NextStep) => void;
}) {
  const useCases = useAuthUseCases();
  const finishSignIn = useFinishSignIn();

  const verify = useCallback(
    async (code: string) => {
      const session = await useCases.completeAccountLink(challengeId ?? '', code);
      onSignedIn(await finishSignIn(session));
    },
    [useCases, challengeId, finishSignIn, onSignedIn],
  );

  return useCodeEntry({ verify });
}
