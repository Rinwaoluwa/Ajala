/** Wire shapes for the Travel subscription (spec §6 "subscription", §2.19, §3.11). */

export interface MySubscriptionDto {
  subscribed: boolean;
  platform: 'apple' | 'google' | 'stripe' | 'comp' | null;
  /** grace = the store is retrying payment; still subscribed. */
  status: 'active' | 'grace' | 'expired' | 'refunded' | null;
  currentPeriodEnd: string | null;
  autoRenew: boolean;
  manage: 'apple' | 'google' | 'web' | null;
}

/** Single use, valid for 5 minutes. */
export interface ChallengeDto {
  challenge: string;
}

/** iOS: a StoreKit 2 purchase plus the App Attest attestation over the challenge. */
export interface VerifyAppleDto {
  signedTransaction: string;
  challenge: string;
  keyId: string;
  attestation: string;
}

/** Android: a Play Billing purchase plus a Play Integrity token with the challenge as nonce. */
export interface VerifyGoogleDto {
  purchaseToken: string;
  challenge: string;
  integrityToken: string;
}

export interface CheckoutDto {
  couponCode?: string;
}

export interface RedirectUrlDto {
  url: string;
}
