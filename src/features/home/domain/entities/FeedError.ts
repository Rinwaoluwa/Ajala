/** Why a feed or Travel call failed, in the terms the screen acts on (by `ErrorResponseDto.code`). */
export type FeedErrorCode =
  /** 404 NO_CITY: no location, no network guess, no home city — set a home city. */
  | 'noCity'
  /** 402 PAYMENT_REQUIRED on teleport: Travel is not (or no longer) on — show the paywall. */
  | 'paymentRequired'
  /** 404 on teleport: the city is not in the catalogue any more. */
  | 'cityNotFound'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class FeedError extends Error {
  readonly code: FeedErrorCode;
  constructor(code: FeedErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'FeedError';
    this.code = code;
  }
}

export const isFeedError = (e: unknown): e is FeedError => e instanceof FeedError;
