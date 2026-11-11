import { useCallback, useEffect, useRef, useState } from 'react';

import { openInApp } from '@core/links/openInApp';

import { isAuthError } from '../../domain/entities/AuthError';
import type { NextStep } from '../../domain/rules/accountRules';
import { authErrorMessages } from '../copy';
import { useAuthUseCases } from '../state/AuthContext';

/**
 * View model for the updated-terms screen: shown after sign-in when `GET /me`
 * says `termsUpToDate: false`, and answered with `POST /me/terms/accept
 * { version }`, the version being `termsVersion` from `GET /app/config`.
 *
 * Accepting reports where to go next rather than assuming home: terms come
 * before profile setup (`nextStepFor`), so someone with both outstanding goes on
 * to finish their profile.
 *
 * The links come from `GET /app/config`, so a moved policy page needs no release;
 * they open inside the app (`openInApp`).
 */
export function useAcceptTerms({ onAccepted }: { onAccepted: (next: NextStep) => void }) {
  const useCases = useAuthUseCases();
  const [links, setLinks] = useState<{ url: string; privacyUrl: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    useCases
      .getCurrentTerms()
      .then((terms) => active && setLinks({ url: terms.url, privacyUrl: terms.privacyUrl }))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [useCases]);

  const accept = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      onAccepted(await useCases.acceptTerms());
    } catch (e) {
      setError(authErrorMessages[isAuthError(e) ? e.code : 'unknown']);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [useCases, onAccepted]);

  return {
    openTerms: links ? () => void openInApp(links.url) : null,
    openPrivacy: links ? () => void openInApp(links.privacyUrl) : null,
    submitting,
    error,
    accept: useCallback(() => void accept(), [accept]),
  };
}
