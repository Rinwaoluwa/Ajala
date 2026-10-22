import { useEffect, useState } from 'react';

import type { NextStep } from '../../domain/rules/accountRules';
import { useAuthState, useAuthUseCases, useCompleteEntryCheck } from '../state/AuthContext';

/**
 * The bootstrap's last step for someone already signed in (spec §2.1 step 4,
 * screen-to-API map §11): ask `GET /me` before letting them into the app, and
 * send them to the updated terms (`termsUpToDate: false`) or to profile setup
 * (`profileCompletedAt: null`) first.
 *
 * Only for a session restored from a previous launch; a sign-in just now was
 * routed by the same answer already (`useFinishSignIn`). It runs once per
 * launch: after it lands, the session is marked checked, so coming back into the
 * app from the terms screen does not ask again.
 *
 * It does not hold the door shut on a slow network. After `PATIENCE_MS` without
 * an answer the person is let in, and if the answer then says otherwise they are
 * moved on when it arrives. Offline, `resolveNextStep` falls back to home; a dead
 * session signs out, and the signed-in area's guard takes it from there.
 *
 *   - `pending`: still asking, within the patience window — draw nothing yet;
 *   - `redirectTo`: where to send them instead of the app, or null.
 */
const PATIENCE_MS = 2500;

export function useEntryCheck(): { pending: boolean; redirectTo: Exclude<NextStep, 'home'> | null } {
  const auth = useAuthState();
  const useCases = useAuthUseCases();
  const completeEntryCheck = useCompleteEntryCheck();

  const needsCheck = auth.status === 'signedIn' && auth.needsEntryCheck;
  const isNew = auth.status === 'signedIn' && auth.session.isNew;

  const [step, setStep] = useState<NextStep | null>(null);
  const [outOfPatience, setOutOfPatience] = useState(false);

  useEffect(() => {
    if (!needsCheck) return;
    let active = true;
    const timer = setTimeout(() => {
      if (active) setOutOfPatience(true);
    }, PATIENCE_MS);

    const settle = (next: NextStep) => {
      if (!active) return;
      clearTimeout(timer);
      // Kept here, not read back from the context: marking the session checked
      // re-renders this before the redirect below has run.
      setStep(next);
      completeEntryCheck();
    };
    useCases.resolveNextStep({ isNew }).then(settle, () => settle('home'));

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [needsCheck, isNew, useCases, completeEntryCheck]);

  return {
    pending: needsCheck && step === null && !outOfPatience,
    redirectTo: step && step !== 'home' ? step : null,
  };
}
