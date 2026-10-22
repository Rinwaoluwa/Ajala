/** Why the feed could not load, in the terms the screen acts on (by `ErrorResponseDto.code`). */
export type FeedErrorCode =
  /** 404 NO_CITY: no location, no network guess, no home city — set a home city. */
  'noCity' | 'network' | 'sessionExpired' | 'unknown';

export class FeedError extends Error {
  readonly code: FeedErrorCode;
  constructor(code: FeedErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'FeedError';
    this.code = code;
  }
}

export const isFeedError = (e: unknown): e is FeedError => e instanceof FeedError;
