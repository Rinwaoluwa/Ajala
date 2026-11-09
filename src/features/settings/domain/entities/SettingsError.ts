/**
 * Why a Settings call failed, in the terms the screens act on. Mapped from the
 * API's `ErrorResponseDto.code` by the data layer, with the call's context
 * (a 401 on "change password" is the current password, not the session).
 */

export type SettingsErrorCode =
  /** 403 REAUTH_REQUIRED: confirm it's you, then try again (spec §2.5). */
  | 'reauthRequired'
  /** The current password (change password, re-auth) was wrong. */
  | 'wrongPassword'
  /** 400 PASSWORD_BREACHED. */
  | 'passwordBreached'
  /** The emailed code was wrong or expired. */
  | 'badCode'
  /** 409 on an email change: someone verified that address meanwhile. */
  | 'emailTaken'
  /** 409 on a handle: someone has it. */
  | 'handleTaken'
  /**
   * 409 HANDLE_COOLDOWN: changed in the last 30 days. `availableAt` carries when,
   * only if the server happens to send it (the spec no longer documents it).
   */
  | 'handleCooldown'
  /** 409 LAST_SIGN_IN_METHOD: unlinking would leave no way in; set a password first. */
  | 'lastSignInMethod'
  /** 403 EMAIL_NOT_VERIFIED on setting a password or exporting data. */
  | 'emailNotVerified'
  /** 409 on setting a first password: the account already has one. */
  | 'alreadyHasPassword'
  /** 409 on a data export: one is being built, or the last was under a day ago. */
  | 'exportTooSoon'
  /** 409 POST_HAS_ATTENDEES on deleting a draft (it went live and people joined). */
  | 'hasAttendees'
  | 'imageTooLarge'
  | 'imageNotSupported'
  /** 400 VALIDATION_FAILED on anything else. */
  | 'invalidDetails'
  | 'notFound'
  /** The city search could not reach Google (no key, offline, refused). */
  | 'placesUnavailable'
  | 'rateLimited'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class SettingsError extends Error {
  readonly code: SettingsErrorCode;
  readonly availableAt: string | null;

  constructor(code: SettingsErrorCode, init: { message?: string; availableAt?: string | null } = {}) {
    super(init.message ?? code);
    this.name = 'SettingsError';
    this.code = code;
    this.availableAt = init.availableAt ?? null;
  }
}

export const isSettingsError = (e: unknown): e is SettingsError => e instanceof SettingsError;
