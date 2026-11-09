/**
 * Why a profile call failed, in the terms the screens act on. Mapped from the
 * API's `ErrorResponseDto.code` by the data layer — never from its message.
 */

export type ProfileErrorCode =
  /** 409 CONFLICT on a handle: someone has it. */
  | 'handleTaken'
  /** 409 HANDLE_COOLDOWN: changed too recently; `availableAt` says when. */
  | 'handleCooldown'
  /** 400 on a handle the server will not take (format, reserved). */
  | 'handleInvalid'
  /** 413: the photo is over 5 MB even after compression. */
  | 'imageTooLarge'
  /** 415: not a JPEG, PNG or WebP. */
  | 'imageNotSupported'
  /** 400 VALIDATION_FAILED on anything else. */
  | 'invalidDetails'
  /** 404 on another person: suspended, deleted, or they blocked the viewer. */
  | 'notFound'
  /** 409 on a report: one about this person is already open. */
  | 'alreadyReported'
  /** 400 on a report or block of your own profile. */
  | 'ownProfile'
  /** The city search or "detect my city" could not reach Google (no key, offline, refused). */
  | 'placesUnavailable'
  | 'rateLimited'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class ProfileError extends Error {
  readonly code: ProfileErrorCode;
  /** HANDLE_COOLDOWN: when the handle can be changed again (ISO date-time). */
  readonly availableAt: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(
    code: ProfileErrorCode,
    {
      message,
      availableAt = null,
      retryAfterSeconds = null,
    }: {
      message?: string;
      availableAt?: string | null;
      retryAfterSeconds?: number | null;
    } = {},
  ) {
    super(message ?? code);
    this.name = 'ProfileError';
    this.code = code;
    this.availableAt = availableAt;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const isProfileError = (e: unknown): e is ProfileError => e instanceof ProfileError;
