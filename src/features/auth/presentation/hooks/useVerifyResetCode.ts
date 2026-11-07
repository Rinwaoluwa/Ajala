import { useCallback, useRef } from 'react';

import { AuthError, isAuthError } from '../../domain/entities/AuthError';
import { RESET_CODE_MAX_ATTEMPTS } from '../../domain/rules/credentialRules';
import { maskEmail } from '../copy';
import { usePasswordResetFlow } from '../state/PasswordResetFlowContext';
import { useCodeEntry } from './useCodeEntry';

/**
 * View model for step 2 of the password reset: the emailed 6-digit code
 * (FRD MOB-006, `POST /auth/password/verify { email, code }` → 200 `{ token }`).
 *
 * A right code buys a one-time reset token, which is kept in the flow's memory
 * for the new-password screen — never in a route param.
 *
 * A wrong, expired or used code is one 401, explained under the boxes. The API
 * burns the code on its fifth wrong try, after which even the right one fails,
 * so wrong tries are counted here: from the fifth on, the screen stops inviting
 * another guess and says to send a new code instead (without spending a call).
 *
 * "Resend code" asks `/auth/password/forgot` again, on the same countdown as
 * email verification (`useCodeEntry`). A new code starts a fresh count.
 */

export type UseVerifyResetCodeOptions = {
  onVerified: () => void;
};

export function useVerifyResetCode({ onVerified }: UseVerifyResetCodeOptions) {
  const { useCases, email, setToken } = usePasswordResetFlow();
  const wrongTries = useRef(0);

  const verify = useCallback(
    async (code: string) => {
      if (!email) throw new AuthError('unknown');
      if (wrongTries.current >= RESET_CODE_MAX_ATTEMPTS) throw new AuthError('codeUsedUp');
      try {
        setToken(await useCases.verifyPasswordResetCode(email, code));
        onVerified();
      } catch (e) {
        if (isAuthError(e) && e.code === 'invalidCode') {
          wrongTries.current += 1;
          if (wrongTries.current >= RESET_CODE_MAX_ATTEMPTS) throw new AuthError('codeUsedUp');
        }
        throw e;
      }
    },
    [useCases, email, setToken, onVerified],
  );

  const resend = useCallback(async () => {
    if (!email) throw new AuthError('unknown');
    await useCases.requestPasswordReset(email);
    wrongTries.current = 0;
  }, [useCases, email]);

  const { otpRef, entry } = useCodeEntry({ verify, resend });

  return {
    otpRef,
    entry: { ...entry, canSubmit: entry.canSubmit && email !== null },
    maskedEmail: email ? maskEmail(email) : null,
    /** False after a restart: the address is gone from memory, so go back and ask again. */
    hasEmail: email !== null,
  };
}
