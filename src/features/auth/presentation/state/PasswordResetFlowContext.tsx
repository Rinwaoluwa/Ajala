import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { AuthUseCases } from '../../authModule';
import { useAuthUseCases } from './AuthContext';

/**
 * State that outlives a single password-reset screen (FRD MOB-006).
 *
 * Only the address is held, so the confirmation screen can say where the email
 * went. The reset token itself never passes through here: it arrives in the link
 * the API emails, and is read from the deep link by the screen that spends it.
 *
 * Mounted by the forgot-password route layout, so it lives exactly as long as the
 * flow and is dropped when the user leaves.
 */

type PasswordResetFlow = {
  useCases: AuthUseCases;
  /** Where the reset link was sent. Shown masked. */
  email: string | null;
  setEmail: (email: string | null) => void;
};

const PasswordResetFlowContext = createContext<PasswordResetFlow | null>(null);

export function PasswordResetFlowProvider({ children }: { children: ReactNode }) {
  const useCases = useAuthUseCases();
  const [email, setEmail] = useState<string | null>(null);

  const value = useMemo(() => ({ useCases, email, setEmail }), [useCases, email]);

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
