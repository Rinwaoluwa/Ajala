import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { createAuthUseCases, type AuthUseCases } from '../../authModule';
import type { AuthSession } from '../../domain/entities/AuthSession';

/**
 * Who is signed in, for the whole app.
 *
 * Mounted at the root rather than inside the auth stack, because the signed-in
 * area has to read it to decide whether to let anyone in, and the entry route has
 * to read it to decide where to send them.
 *
 * `status` starts as `loading` while the stored session is read out of the
 * keychain. Nothing may route on it until that resolves — redirecting early is
 * what sends a signed-in user back to the sign-in screen on every cold start.
 *
 * The use cases are built here too, once, so every flow shares one repository —
 * and one refresh in flight, which matters because refresh tokens are single use.
 *
 * The tokens held in `state` are a snapshot: a refresh may rotate them in the
 * store. Nothing reads tokens from here; calls that need one go through the use
 * cases, which read the store.
 *
 * `needsEntryCheck` marks a session restored from a previous launch. Nobody has
 * asked `GET /me` about it yet this run, so the signed-in area does
 * (`useEntryCheck`) before letting the person in — the terms may have changed
 * since (spec §2.1 step 4). A session from a sign-in just now has already been
 * routed by that same answer, so it starts checked.
 */

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; session: AuthSession; needsEntryCheck: boolean };

type AuthContextValue = {
  useCases: AuthUseCases;
  state: AuthState;
  /** Keeps a session the API just issued, and signs the app in. */
  keepSession: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  /** Records that `GET /me` has routed the restored session. */
  completeEntryCheck: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const queryClient = useQueryClient();
  const useCases = useMemo(
    () =>
      createAuthUseCases({
        onSessionEnded: () => {
          // Nothing cached for the account may outlive its session (spec §7).
          queryClient.clear();
          setState({ status: 'signedOut' });
        },
      }),
    [queryClient],
  );

  useEffect(() => {
    useCases.warmUp();
    // Guards against setting state after the tree has gone away.
    let active = true;
    useCases
      .restoreSession()
      .then((session) => {
        if (active) {
          setState(session ? { status: 'signedIn', session, needsEntryCheck: true } : { status: 'signedOut' });
        }
      })
      .catch(() => {
        // The store already swallows its own failures; this is belt and braces.
        if (active) setState({ status: 'signedOut' });
      });
    return () => {
      active = false;
    };
  }, [useCases]);

  const keepSession = useCallback(
    async (session: AuthSession) => {
      await useCases.keepSession(session);
      setState({ status: 'signedIn', session, needsEntryCheck: false });
    },
    [useCases],
  );

  const completeEntryCheck = useCallback(() => {
    setState((current) =>
      current.status === 'signedIn' && current.needsEntryCheck ? { ...current, needsEntryCheck: false } : current,
    );
  }, []);

  const signOut = useCallback(async () => {
    // Tell the API first so the session stops working on the server too, then
    // clear locally. The use case never rejects, so a dead network still signs
    // the person out on this device.
    await useCases.signOut();
    queryClient.clear();
    setState({ status: 'signedOut' });
  }, [useCases, queryClient]);

  const value = useMemo(
    () => ({ useCases, state, keepSession, signOut, completeEntryCheck }),
    [useCases, state, keepSession, signOut, completeEntryCheck],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider (the root layout).');
  return value;
}

export function useAuthUseCases(): AuthUseCases {
  return useAuth().useCases;
}

/** The signed-in state, for guards and the entry route. */
export function useAuthState(): AuthState {
  return useAuth().state;
}

/** Stores a session the API just issued. */
export function useKeepSession() {
  return useAuth().keepSession;
}

export function useSignOut() {
  return useAuth().signOut;
}

/** Makes API calls as the signed-in person; see `AuthorizedRequest`. */
export function useAuthorizedRequest() {
  return useAuth().useCases.authorizedRequest;
}

export function useCompleteEntryCheck() {
  return useAuth().completeEntryCheck;
}
