import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Credentials } from '../../domain/entities/Credentials';

/**
 * State that outlives a single sign-in screen.
 *
 * A step-up challenge is answered by sending the SAME email and password back to
 * `/auth/login` with the emailed code, from the Verification screen. So the
 * credentials have to survive one navigation — and they are held here, in
 * memory, rather than in route params, which are logged, restored after a crash
 * and visible to anything that inspects the navigation state.
 *
 * Mounted by the sign-in route layout, so the password is dropped the moment the
 * person leaves the sign-in flow.
 */

type SignInFlow = {
  /** Set while the API is waiting for a step-up code. */
  stepUp: Credentials | null;
  setStepUp: (credentials: Credentials | null) => void;
};

const SignInFlowContext = createContext<SignInFlow | null>(null);

export function SignInFlowProvider({ children }: { children: ReactNode }) {
  const [stepUp, setStepUp] = useState<Credentials | null>(null);
  const value = useMemo(() => ({ stepUp, setStepUp }), [stepUp]);
  return <SignInFlowContext.Provider value={value}>{children}</SignInFlowContext.Provider>;
}

export function useSignInFlow(): SignInFlow {
  const flow = useContext(SignInFlowContext);
  if (!flow) {
    throw new Error('useSignInFlow must be used inside SignInFlowProvider (the sign-in route layout).');
  }
  return flow;
}
