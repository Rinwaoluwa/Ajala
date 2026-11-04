/** Why a Trips list could not load, by the API's code (spec §5). */
export type TripsErrorCode = 'network' | 'sessionExpired' | 'unknown';

export class TripsError extends Error {
  readonly code: TripsErrorCode;
  constructor(code: TripsErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'TripsError';
    this.code = code;
  }
}

export const isTripsError = (e: unknown): e is TripsError => e instanceof TripsError;
