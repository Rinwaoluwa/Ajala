/** Why an Explore call failed, in the terms the screen acts on (by `ErrorResponseDto.code`). */
export type ExploreErrorCode =
  /** 404 NO_LOCATION: no location and no teleport. Ask for location, or offer a place. */
  | 'noLocation'
  /** The place search on the phone failed (no key, Google refused, offline): `PlacesError`. */
  | 'placesUnavailable'
  | 'network'
  | 'sessionExpired'
  /** The post is gone, hidden, or its host blocked the viewer. */
  | 'notFound'
  | 'postFull'
  | 'postStarted'
  | 'postCancelled'
  /** 409 on a report: one is already open. */
  | 'alreadyReported'
  /** 403 REPORTING_PAUSED: a moderator paused this person's reporting (blocking still works). */
  | 'reportingPaused'
  /** A plain 409 anywhere else: the post changed under us — re-read it. */
  | 'conflict'
  /** 400 VALIDATION_FAILED on a report with no field named: it is the person's own post. */
  | 'ownPost'
  /** 400 VALIDATION_FAILED on a report's `details`: "other" needs words. */
  | 'detailsRequired'
  | 'rateLimited'
  | 'unknown';

export class ExploreError extends Error {
  readonly code: ExploreErrorCode;
  constructor(code: ExploreErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ExploreError';
    this.code = code;
  }
}

export const isExploreError = (e: unknown): e is ExploreError => e instanceof ExploreError;
