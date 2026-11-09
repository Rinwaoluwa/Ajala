import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import type { IdentityProvider, SignInMethod } from '../../domain/entities/Account';
import { isAuthError } from '../../domain/entities/AuthError';
import type { NextStep } from '../../domain/rules/accountRules';
import { authErrorMessages, emailRegisteredCopy, providerNames } from '../copy';
import { useAuthUseCases } from '../state/AuthContext';
import { useFinishSignIn } from './useFinishSignIn';

/**
 * View model for the Google and Apple buttons, shared by the sign-up and sign-in
 * options screens — one endpoint per provider serves both.
 *
 * Outcomes:
 *   - signed in or up → `onSignedIn` with where `GET /me` says to go (a new
 *     account always lands on profile setup);
 *   - the email already has an account that signs in another way (409
 *     EMAIL_ALREADY_REGISTERED) → an alert saying how to get in ("Sign in with
 *     Google instead"), with a button for each way it can take them: the other
 *     provider straight away, or the password through `onUsePassword`. The API
 *     never joins the two accounts, so there is no linking step;
 *   - the person closed the provider's sheet → nothing at all;
 *   - anything else → a native alert. These screens have no error slot in the
 *     design, and an alert is the platform's own way to report a failed sign-in.
 *
 * Apple is only offered where it can run: Sign in with Apple does not exist on
 * Android. Until the check answers, iOS assumes yes so the button does not pop in.
 */

export type UseProviderSignInOptions = {
  onSignedIn: (next: NextStep) => void;
  /** Opens the email and password sign-in, for an account that uses a password. */
  onUsePassword: () => void;
};

/**
 * Android shows at most three alert buttons, and one is always "Not now", so at
 * most two ways in get a button. The message still names every one.
 */
const MAX_METHOD_BUTTONS = 2;

export function useProviderSignIn({ onSignedIn, onUsePassword }: UseProviderSignInOptions) {
  const useCases = useAuthUseCases();
  const finishSignIn = useFinishSignIn();
  const [pending, setPending] = useState<IdentityProvider | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');
  const inFlight = useRef(false);
  // The alert's "Sign in with Apple" runs this same flow again, after it has finished.
  const signInRef = useRef<(provider: IdentityProvider) => Promise<void>>(async () => undefined);

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
        if (code === 'emailAlreadyRegistered' && isAuthError(e)) {
          // The provider just tried can't be the way in, whatever the list says.
          offerOtherWays(e.signInMethods.filter((m) => m !== provider));
          return;
        }
        Alert.alert(`${providerNames[provider]} sign-in didn't work`, authErrorMessages[code]);
      } finally {
        inFlight.current = false;
        setPending(null);
      }

      function offerOtherWays(methods: SignInMethod[]) {
        // Apple has no button on Android; it is still named, for their iPhone.
        const offered = methods
          .filter((m) => m !== 'apple' || appleAvailable)
          .slice(0, MAX_METHOD_BUTTONS);
        Alert.alert(emailRegisteredCopy.title, emailRegisteredCopy.message(methods), [
          ...offered.map((m) => ({
            text: emailRegisteredCopy.button(m),
            onPress: () => (m === 'password' ? onUsePassword() : void signInRef.current(m)),
          })),
          { text: emailRegisteredCopy.dismiss, style: 'cancel' as const },
        ]);
      }
    },
    [useCases, finishSignIn, onSignedIn, onUsePassword, appleAvailable],
  );

  useEffect(() => {
    signInRef.current = signIn;
  }, [signIn]);

  return {
    pending,
    appleAvailable,
    signInWithApple: useCallback(() => void signIn('apple'), [signIn]),
    signInWithGoogle: useCallback(() => void signIn('google'), [signIn]),
  };
}
