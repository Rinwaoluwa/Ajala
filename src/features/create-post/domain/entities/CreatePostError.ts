/**
 * Why publishing or saving a post failed, in the terms the wizard acts on.
 * Mapped from the API's `ErrorResponseDto.code` by the data layer (spec §5,
 * API map §5) — never from its message.
 */

export type CreatePostErrorCode =
  /** 400 VALIDATION_FAILED: `fieldErrors` names every publish rule that failed. */
  | 'invalid'
  /** 409 EVENT_MONTHLY_CAP: three Events this month; `resetsAt` says when that lifts. */
  | 'eventMonthlyCap'
  /** 409 CONFLICT on the 21st draft. */
  | 'draftLimit'
  /** 409 on an edit or publish: the post was cancelled, taken down or is already live. */
  | 'conflict'
  /** 413: a photo is over 5 MB even after compression. */
  | 'imageTooLarge'
  /** 415: a photo is not a JPEG, PNG or WebP. */
  | 'imageNotSupported'
  /** 403: the host's account is suspended. */
  | 'suspended'
  /** The meeting point could not be found on the map. */
  | 'placeNotFound'
  /** Google place search failed (no key, Google down, offline): the pickers can't search. */
  | 'placesUnavailable'
  /**
   * 503 SERVICE_UNAVAILABLE: the server is handling too many uploads, or its
   * map lookup for the place is down (spec §2.12). Trying again shortly helps.
   */
  | 'busy'
  | 'rateLimited'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export type PostFieldError = { field: string; message: string };

export class CreatePostError extends Error {
  readonly code: CreatePostErrorCode;
  readonly fieldErrors: PostFieldError[];
  /** EVENT_MONTHLY_CAP: ISO date-time the cap resets. */
  readonly resetsAt: string | null;

  constructor(
    code: CreatePostErrorCode,
    init: { message?: string; fieldErrors?: PostFieldError[]; resetsAt?: string | null } = {},
  ) {
    super(init.message ?? code);
    this.name = 'CreatePostError';
    this.code = code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.resetsAt = init.resetsAt ?? null;
  }
}

export const isCreatePostError = (e: unknown): e is CreatePostError => e instanceof CreatePostError;
