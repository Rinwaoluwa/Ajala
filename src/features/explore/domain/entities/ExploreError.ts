/** Why an Explore call failed, in the terms the screen acts on (by `ErrorResponseDto.code`). */
export type ExploreErrorCode =
  /** 404 NO_CITY: no location, network guess or home city. */
  | 'noCity'
  | 'network'
  | 'sessionExpired'
  /** The post is gone, hidden, or its host blocked the viewer. */
  | 'notFound'
  | 'postFull'
  | 'postStarted'
  | 'postCancelled'
  /** A paid Event books through its link, never an RSVP. */
  | 'externalBooking'
  /** 409 on a report: one is already open. */
  | 'alreadyReported'
  /** 403 REPORTING_PAUSED: a moderator paused this person's reporting (blocking still works). */
  | 'reportingPaused'
  /** A plain 409 anywhere else: the post changed under us — re-read it. */
  | 'conflict'
  /** 400 on a report or RSVP: it is the person's own post. */
  | 'ownPost'
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
