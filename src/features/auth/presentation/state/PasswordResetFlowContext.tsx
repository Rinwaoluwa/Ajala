import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { AuthUseCases } from '../../authModule';
import { useAuthUseCases } from './AuthContext';

/**
 * State that outlives a single password-reset screen (FRD MOB-006).
 *
 * The reset is three calls on three screens: the address goes to
 * `/auth/password/forgot`, the emailed code and the same address to
 * `/auth/password/verify`, and the token that answers to `/auth/password/reset`.
 * The address and the token are held here, in memory, rather than passed as
 * route params: the token is a one-time key to the account, and nothing about
 * it belongs in a URL or a navigation log.
 *
 * Mounted by the forgot-password route layout, so it lives exactly as long as the
 * flow and both values are dropped when the user leaves.
 */

type PasswordResetFlow = {
  useCases: AuthUseCases;
  /** Where the code was sent. Shown masked, and sent again with the code. */
  email: string | null;
  setEmail: (email: string | null) => void;
  /** What a right code bought: single use, 15 minutes. Null until then. */
  token: string | null;
  setToken: (token: string | null) => void;
};

const PasswordResetFlowContext = createContext<PasswordResetFlow | null>(null);

export function PasswordResetFlowProvider({ children }: { children: ReactNode }) {
  const useCases = useAuthUseCases();
  const [email, setEmail] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const value = useMemo(
    () => ({ useCases, email, setEmail, token, setToken }),
    [useCases, email, token],
  );

  return (
    <PasswordResetFlowContext.Provider value={value}>{children}</PasswordResetFlowContext.Provider>
  );
}

export function usePasswordResetFlow(): PasswordResetFlow {
  const flow = useContext(PasswordResetFlowContext);
  if (!flow) {
    throw new Error(
      'usePasswordResetFlow must be used inside PasswordResetFlowProvider (the forgot-password route layout).',
    );
  }
  return flow;
}
