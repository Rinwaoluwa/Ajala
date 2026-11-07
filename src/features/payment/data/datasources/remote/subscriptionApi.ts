import type {
  ChallengeDto,
  CheckoutDto,
  MySubscriptionDto,
  RedirectUrlDto,
  VerifyAppleDto,
  VerifyGoogleDto,
} from '../../dto/subscriptionDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The subscription endpoints as the signed-in person (spec §2.19, §3.11).
 * `request` is auth's `AuthorizedRequest`.
 */
export type SubscriptionRequest = <T>(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  retry?: boolean;
}) => Promise<T>;

export function createSubscriptionApi(request: SubscriptionRequest) {
  return {
    get: () => request<MySubscriptionDto>({ method: 'GET', path: `${V1}/me/subscription` }),

    /** 404 when there is no web subscription. */
    portal: () => request<RedirectUrlDto>({ method: 'POST', path: `${V1}/me/subscription/portal` }),

    // ---- Buying. Typed and ready, not called yet: this build has no store SDK or
    // device attestation (see the feature README for what turning it on needs). ----

    /** Step 1 on every platform: a single-use challenge, valid 5 minutes. */
    challenge: () => request<ChallengeDto>({ method: 'GET', path: `${V1}/me/subscription/challenge` }),

    /**
     * iOS, after the StoreKit 2 purchase (bought with `appAccountToken` = user id).
     * Also "Restore purchase". 403 attestation or purchase failed; 409 bought by
     * another account; 503 subscriptions off.
     */
    verifyApple: (body: VerifyAppleDto) =>
      request<MySubscriptionDto>({ method: 'POST', path: `${V1}/me/subscription/apple`, body }),

    /** Android, after the Play purchase (`obfuscatedAccountId` = user id). Errors as Apple's. */
    verifyGoogle: (body: VerifyGoogleDto) =>
      request<MySubscriptionDto>({ method: 'POST', path: `${V1}/me/subscription/google`, body }),

    /** Web checkout: open the `url`. 400 bad coupon; 409 already subscribed or coupon used; 503. */
    checkout: (body: CheckoutDto) =>
      request<RedirectUrlDto>({ method: 'POST', path: `${V1}/me/subscription/checkout`, body }),

    /** Back from the web checkout. Safe to repeat: offer "Refresh" rather than polling. */
    confirmCheckout: () =>
      request<MySubscriptionDto>({ method: 'POST', path: `${V1}/me/subscription/checkout/confirm` }),
  };
}

export type SubscriptionApi = ReturnType<typeof createSubscriptionApi>;
