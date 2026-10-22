/**
 * Wire shapes for the `User / Auth` endpoints, transcribed from
 * `contracts/openapi/ajala-api.json`.
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

type DeviceFieldsDto = {
  /** Stable per-install id; the same id replaces its previous session. */
  deviceId?: string;
  deviceName?: string;
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
   * The password just chosen at sign-up. Required by the API when the code
   * completes an email sign-up (client spec §2.2); absent otherwise. Not in the
   * repo's OpenAPI copy of this DTO — flagged to the backend.
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

export type OAuthLinkRequestDto = DeviceFieldsDto & {
  /** From the 409 ACCOUNT_LINK_REQUIRED answer. */
  challengeId: string;
  code: string;
};

export type ForgotPasswordRequestDto = { email: string };

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
  /** Null until name, date of birth and gender are all set. */
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
