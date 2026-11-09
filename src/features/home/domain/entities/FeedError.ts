/** Why a feed or Travel call failed, in the terms the screen acts on (by `ErrorResponseDto.code`). */
export type FeedErrorCode =
  /**
   * 404 NO_LOCATION: the phone sent no location and there is no teleport. Not a
   * failure to apologise for: the screen asks for location, or offers a place.
   */
  | 'noLocation'
  /** 402 PAYMENT_REQUIRED on teleport: Travel is not (or no longer) on — show the paywall. */
  | 'paymentRequired'
  /** 400 on teleport: the place is unknown, or not a city (a venue, an address). */
  | 'notACity'
  /** 503 on teleport: the map vendor is off or did not answer. Worth another go. */
  | 'unavailable'
  /** The place search itself failed (Google refused, no key, offline): `PlacesError`. */
  | 'placesUnavailable'
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
