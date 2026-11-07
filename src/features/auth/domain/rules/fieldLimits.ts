/**
 * The API's length limits for what the auth flows send, from
 * `docs/api/ajala-api-users-common.md` §4.
 *
 * The API rejects the whole request when one field is over, with a
 * `VALIDATION_FAILED` worded for developers. Checking first keeps that round
 * trip, and that wording, away from the person.
 *
 * Only what a person types is checked here. Values the app supplies itself —
 * device name, timezone — are kept in range where they are produced
 * (`core/device`), and values the server hands out — `termsVersion` — are sent
 * back as given.
 */
export const fieldLimits = {
  /** `SignupEmailDto.email`, `LoginDto.email`, `OtpVerifyDto.target`, `ForgotPasswordDto.email`. */
  emailMax: 320,
  /** Sign-up and new passwords: 8–128. Sign-in passwords: at most 128. */
  passwordMin: 8,
  passwordMax: 128,
  /** `firstName` / `lastName`, at sign-up and from Apple: 1–60. */
  nameMax: 60,
} as const;

/** Cuts a value the person did not type (Apple's name) to fit, rather than failing on it. */
export function fitToLimit(value: string | undefined, max: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}
