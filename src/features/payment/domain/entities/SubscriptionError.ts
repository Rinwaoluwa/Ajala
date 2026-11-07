/** Why a subscription call failed, in the terms the paywall acts on (by `ErrorResponseDto.code`). */
export type SubscriptionErrorCode =
  /** 503 SERVICE_UNAVAILABLE: subscriptions are switched off in this environment. */
  | 'unavailable'
  /** 404 from the billing portal: there is no web subscription to manage. */
  | 'noWebSubscription'
  | 'network'
  | 'sessionExpired'
  | 'unknown';

export class SubscriptionError extends Error {
  readonly code: SubscriptionErrorCode;
  constructor(code: SubscriptionErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'SubscriptionError';
    this.code = code;
  }
}

export const isSubscriptionError = (e: unknown): e is SubscriptionError => e instanceof SubscriptionError;
