import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { IdentityProvider } from '../../domain/entities/Account';
import { isAuthError } from '../../domain/entities/AuthError';
import type { NextStep } from '../../domain/rules/accountRules';
import { authErrorMessages, providerNames } from '../copy';
import { useAuthUseCases } from '../state/AuthContext';
import { useFinishSignIn } from './useFinishSignIn';

/**
 * View model for the Google and Apple buttons, shared by the sign-up and sign-in
 * options screens — one endpoint per provider serves both.
 *
 * Outcomes:
 *   - signed in or up → `onSignedIn` with where `GET /me` says to go (a new
 *     account always lands on profile setup);
 *   - the email already has an account → `onLinkRequired` with the challenge,
 *     for the Verification screen to finish;
 *   - the person closed the provider's sheet → nothing at all;
 *   - anything else → a native alert. These screens have no error slot in the
 *     design, and an alert is the platform's own way to report a failed sign-in.
 *
 * Apple is only offered where it can run: Sign in with Apple does not exist on
 * Android. Until the check answers, iOS assumes yes so the button does not pop in.
 */

export type UseProviderSignInOptions = {
  onSignedIn: (next: NextStep) => void;
  onLinkRequired: (challengeId: string, provider: IdentityProvider) => void;
};

export function useProviderSignIn({ onSignedIn, onLinkRequired }: UseProviderSignInOptions) {
  const useCases = useAuthUseCases();
  const finishSignIn = useFinishSignIn();
  const [pending, setPending] = useState<IdentityProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const inFlight = useRef(false);

  useEffect(() => {
    let active = true;
    void useCases.isProviderAvailable('apple').then((available) => {
      if (active) setAppleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, [useCases]);

  const signIn = useCallback(
    async (provider: IdentityProvider) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(provider);
      try {
        onSignedIn(await finishSignIn(await useCases.signInWithProvider(provider)));
      } catch (e) {
        const code = isAuthError(e) ? e.code : 'unknown';
        if (code === 'cancelled') return;
        if (code === 'accountLinkRequired' && isAuthError(e) && e.challengeId) {
          onLinkRequired(e.challengeId, provider);
          return;
        }
        Alert.alert(`${providerNames[provider]} sign-in didn't work`, authErrorMessages[code]);
      } finally {
        inFlight.current = false;
        setPending(null);
      }
    },
    [useCases, finishSignIn, onSignedIn, onLinkRequired],
  );

  return {
    pending,
    appleAvailable,
    signInWithApple: useCallback(() => void signIn('apple'), [signIn]),
    signInWithGoogle: useCallback(() => void signIn('google'), [signIn]),
  };
}
