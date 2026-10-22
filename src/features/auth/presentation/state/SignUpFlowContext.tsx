import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { AuthUseCases } from '../../authModule';
import type { EmailVerification } from '../../domain/entities/EmailVerification';
import { useAuthUseCases } from './AuthContext';

/**
 * State that outlives a single sign-up screen.
 *
 * The details screen starts a verification and the verification screen finishes
 * it, so the pending verification is held here rather than passed as route params.
 * That keeps the email address — and the password the verify call needs — out of
 * URLs and navigation logs.
 *
 * Mounted by the auth route layout rather than the sign-up one: sign-in also
 * sends an unverified account to the verification screen (without a password —
 * only a sign-up's verification sends one).
 * Everything here is in memory and goes when the person leaves the auth screens.
 */

type SignUpFlow = {
  useCases: AuthUseCases;
  verification: EmailVerification | null;
  setVerification: (verification: EmailVerification | null) => void;
};

const SignUpFlowContext = createContext<SignUpFlow | null>(null);

export function SignUpFlowProvider({ children }: { children: ReactNode }) {
  const useCases = useAuthUseCases();
  const [verification, setVerification] = useState<EmailVerification | null>(null);

  const value = useMemo(
    () => ({ useCases, verification, setVerification }),
    [useCases, verification],
  );

  return <SignUpFlowContext.Provider value={value}>{children}</SignUpFlowContext.Provider>;
}

export function useSignUpFlow(): SignUpFlow {
  const flow = useContext(SignUpFlowContext);
  if (!flow) throw new Error('useSignUpFlow must be used inside SignUpFlowProvider (the sign-up route layout).');
  return flow;
}
