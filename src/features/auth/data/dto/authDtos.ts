/**
 * Wire shapes for the `User / Auth` endpoints, transcribed from the client spec's
 * types (`docs/api/ajala-api-users-common.md` §6).
 *
 * These mirror the API exactly, including names the app does not use that way —
 * `target` for the address a code went to, `dob` for the date of birth. Mapping
 * to the app's own vocabulary happens in `authMappers`, so a rename on either
 * side is one file's problem.
 *
 * The API rejects any property it does not list ("property x should not exist"),
 * so these are exact: a field the screen-to-API map mentions but the contract
 * does not — `timezone` on login — is left out on purpose.
 */

/**
 * An iOS DeviceCheck or Android Play Integrity token. The API uses it only to
 * spot people evading a ban, and never makes sign-in depend on it.
 */
export type DeviceCheckDto = {
  platform: 'ios' | 'android';
  /** Up to 8192 characters. */
  token: string;
};

type DeviceFieldsDto = {
  /** Stable per-install id; the same id replaces its previous session. */
  deviceId?: string;
  deviceName?: string;
  /** Optional. The app does not send it yet: it has no native DeviceCheck or Play Integrity module. */
  deviceCheck?: DeviceCheckDto;
};

export type SignUpEmailRequestDto = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** Calendar date, `YYYY-MM-DD`. */
  dob: string;
  termsVersion?: string;
  timezone?: string;
};

export type OtpVerifyRequestDto = DeviceFieldsDto & {
  /** The email address the code was sent to. */
  target: string;
  code: string;
  /**
   * The password just chosen at sign-up. Required when the code completes an
   * email sign-up (spec §2.2): without it, or with the wrong one, the API gives
   * the same 401 as a wrong code. Left out for an account that already exists.
   */
  password?: string;
  timezone?: string;
};

export type OtpResendRequestDto = DeviceFieldsDto & { target: string };

export type LoginRequestDto = DeviceFieldsDto & {
  email: string;
  password: string;
  /** Sent only when the API has asked for a step-up code. */
  otpCode?: string;
};

export type AppleSignInRequestDto = DeviceFieldsDto & {
  identityToken: string;
  authorizationCode: string;
  /** The raw nonce. Apple was given its SHA-256. */
  nonce: string;
  /** Apple hands the name over on the first authorisation only. */
  firstName?: string;
  lastName?: string;
  termsVersion?: string;
  timezone?: string;
};

export type GoogleSignInRequestDto = DeviceFieldsDto & {
  idToken: string;
  nonce: string;
  termsVersion?: string;
  timezone?: string;
};

export type ForgotPasswordRequestDto = { email: string };

/** The address the reset was asked for, and the emailed 6 digits. */
export type VerifyResetCodeDto = { email: string; code: string };

/** What a right reset code buys. Works once, for 15 minutes. */
export type ResetTokenDto = { token: string };

/** `ResetPasswordDto`: `token` comes from `POST /auth/password/verify`. */
export type ResetPasswordRequestDto = { token: string; newPassword: string };

export type RefreshRequestDto = DeviceFieldsDto & { refreshToken: string };

export type AcceptTermsRequestDto = { version: string };

/**
 * `MeDto`, trimmed to what the app reads. The API sends a good deal more (photos,
 * interests, extras); those get typed when a screen needs them.
 */
export type MeDto = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /**
   * Null until the profile is complete. The server decides what "complete" means
   * (the spec disagrees with itself about gender, §8), so the app only reads it.
   */
  profileCompletedAt: string | null;
  /** False when the terms changed and need accepting again. */
  termsUpToDate: boolean;
};

/** What sign-in and refresh return (`TokenPairDto`). */
export type SessionDto = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  sessionId: string;
};

/**
 * What verifying a code, a Google or Apple sign-in, and finishing an account
 * link return (`OtpSignInDto`): a session plus who it belongs to.
 */
export type VerifiedSessionDto = SessionDto & {
  isNew: boolean;
  user: Pick<MeDto, 'id'> & Partial<MeDto>;
};
