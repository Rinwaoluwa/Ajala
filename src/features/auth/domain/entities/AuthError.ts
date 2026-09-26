/**
 * Failures the sign-up flow knows how to explain. A repository maps whatever its
 * backend returns onto one of these, so presentation never parses a server message.
 */
export type AuthErrorCode = 'emailTaken' | 'invalidCode' | 'invalidDetails' | 'network' | 'unknown';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const isAuthError = (e: unknown): e is AuthError => e instanceof AuthError;
