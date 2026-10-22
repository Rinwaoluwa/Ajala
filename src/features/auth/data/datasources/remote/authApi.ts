import { apiRequest } from '@core/api/apiClient';
import { getAppConfig } from '@core/config/appConfig';
import { getDeviceId, getDeviceName, getTimezone } from '@core/device/deviceIdentity';

import type {
  AcceptTermsRequestDto,
  AppleSignInRequestDto,
  ForgotPasswordRequestDto,
  GoogleSignInRequestDto,
  LoginRequestDto,
  MeDto,
  OAuthLinkRequestDto,
  OtpResendRequestDto,
  OtpVerifyRequestDto,
  RefreshRequestDto,
  ResetPasswordRequestDto,
  SessionDto,
  SignUpEmailRequestDto,
  VerifiedSessionDto,
} from '../../dto/authDtos';

/**
 * The `User / Auth` endpoints, plus the two `/me` calls sign-in needs, one
 * function per operation.
 *
 * Paths and shapes come from `contracts/openapi/ajala-api.json` and the
 * screen-to-API map. This layer only calls; turning failures into the app's own
 * errors is the repository's job.
 *
 * Endpoints that create a session also carry this device's id and name, so the
 * API can replace the previous session for the same install and show the person
 * a meaningful list of where they are signed in.
 */

const AUTH = '/api/v1/auth';
const ME = '/api/v1/me';

type DeviceFields = 'deviceId' | 'deviceName';

async function deviceFields() {
  return { deviceId: await getDeviceId(), deviceName: getDeviceName() };
}

/**
 * The terms version in force. Sign-up and the Google/Apple calls record it as
 * accepted, so it has to be the live value, never a constant compiled in.
 * `fresh` skips the remembered app config, after the API said it was stale.
 */
async function termsVersion(fresh = false): Promise<string> {
  return (await getAppConfig({ fresh })).termsVersion;
}

export const authApi = {
  /**
   * 202, no body: a code is emailed when the address is new or unverified.
   *
   * The OpenAPI document lists `termsVersion` as optional, but the server
   * validates it as a required string and rejects the whole request without it —
   * every email sign-up failed until it was added.
   */
  async signUpWithEmail(
    body: SignUpEmailRequestDto,
    { freshTerms = false }: { freshTerms?: boolean } = {},
  ): Promise<void> {
    await apiRequest<void>({
      method: 'POST',
      path: `${AUTH}/signup/email`,
      body: {
        ...body,
        termsVersion: body.termsVersion ?? (await termsVersion(freshTerms)),
        timezone: body.timezone ?? getTimezone(),
      },
    });
  },

  /**
   * 200: verifying a code also signs the person in.
   *
   * `password` is not in the repo's OpenAPI copy of `OtpVerifyDto`, but the
   * client spec (§2.2, §6) requires it when the code completes a sign-up, and
   * the API answers 401 without it. Sent only then — see `AuthRepository`.
   */
  async verifyOtp(body: Omit<OtpVerifyRequestDto, DeviceFields>) {
    return apiRequest<VerifiedSessionDto>({
      method: 'POST',
      path: `${AUTH}/otp/verify`,
      body: { ...body, ...(await deviceFields()), timezone: body.timezone ?? getTimezone() },
    });
  },

  /** 202, no body: whether a code went out is not revealed. 3 an hour per address. */
  async resendOtp(body: Omit<OtpResendRequestDto, DeviceFields>): Promise<void> {
    await apiRequest<void>({
      method: 'POST',
      path: `${AUTH}/otp/resend`,
      body: { ...body, ...(await deviceFields()) },
    });
  },

  /**
   * 200 with a token pair. The screen-to-API map lists `timezone` here too, but
   * the live API rejects the whole request when it is sent ("property timezone
   * should not exist"), so it is not.
   */
  async login(body: Omit<LoginRequestDto, DeviceFields>) {
    return apiRequest<SessionDto>({
      method: 'POST',
      path: `${AUTH}/login`,
      body: { ...body, ...(await deviceFields()) },
    });
  },

  /** 200, or 409 ACCOUNT_LINK_REQUIRED with `details.challengeId`. */
  async signInWithApple(
    body: Omit<AppleSignInRequestDto, DeviceFields | 'termsVersion' | 'timezone'>,
  ) {
    return apiRequest<VerifiedSessionDto>({
      method: 'POST',
      path: `${AUTH}/oauth/apple`,
      body: {
        ...body,
        termsVersion: await termsVersion(),
        timezone: getTimezone(),
        ...(await deviceFields()),
      },
    });
  },

  /** 200, or 409 ACCOUNT_LINK_REQUIRED with `details.challengeId`. */
  async signInWithGoogle(
    body: Omit<GoogleSignInRequestDto, DeviceFields | 'termsVersion' | 'timezone'>,
  ) {
    return apiRequest<VerifiedSessionDto>({
      method: 'POST',
      path: `${AUTH}/oauth/google`,
      body: {
        ...body,
        termsVersion: await termsVersion(),
        timezone: getTimezone(),
        ...(await deviceFields()),
      },
    });
  },

  /** 200: the provider is attached to the existing account and the caller is signed in. */
  async completeOAuthLink(body: Omit<OAuthLinkRequestDto, DeviceFields>) {
    return apiRequest<VerifiedSessionDto>({
      method: 'POST',
      path: `${AUTH}/oauth/link`,
      body: { ...body, ...(await deviceFields()) },
    });
  },

  /** 202, no body: the answer is the same whether or not the address has an account. */
  async forgotPassword(body: ForgotPasswordRequestDto): Promise<void> {
    await apiRequest<void>({ method: 'POST', path: `${AUTH}/password/forgot`, body });
  },

  /** 204: the password is set and every device is signed out. */
  async resetPassword(body: ResetPasswordRequestDto): Promise<void> {
    await apiRequest<void>({ method: 'POST', path: `${AUTH}/password/reset`, body });
  },

  /** 200 with a NEW pair; the refresh token just sent is void from now on. */
  async refresh(body: Omit<RefreshRequestDto, DeviceFields>) {
    return apiRequest<SessionDto>({
      method: 'POST',
      path: `${AUTH}/refresh`,
      body: { ...body, ...(await deviceFields()) },
    });
  },

  /** 204: this device is signed out. */
  async logout(accessToken: string): Promise<void> {
    await apiRequest<void>({ method: 'POST', path: `${AUTH}/logout`, accessToken });
  },

  /** 200 `MeDto`. A login answers with tokens only, so this is how sign-in learns who it is. */
  async getMe(accessToken: string) {
    return apiRequest<MeDto>({ method: 'GET', path: ME, accessToken });
  },

  /** 204. 400 when the version is not the one in force. */
  async acceptTerms(accessToken: string, body: AcceptTermsRequestDto): Promise<void> {
    await apiRequest<void>({ method: 'POST', path: `${ME}/terms/accept`, body, accessToken });
  },

  async getTerms({ fresh = false }: { fresh?: boolean } = {}) {
    const config = await getAppConfig({ fresh });
    return { version: config.termsVersion, url: config.termsUrl, privacyUrl: config.privacyUrl };
  },
};
