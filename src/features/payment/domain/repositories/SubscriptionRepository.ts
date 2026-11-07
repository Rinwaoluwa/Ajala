import type { Subscription } from '../entities/Subscription';

/**
 * The subscription's contract; the data layer implements it over the API.
 * Rejects with `SubscriptionError`.
 *
 * Buying is not here yet: it needs the store SDKs and device attestation the
 * app does not ship (see the feature README). The endpoints are typed in
 * `data/datasources/remote/subscriptionApi.ts`, ready for it.
 */
export interface SubscriptionRepository {
  /** `GET /me/subscription`. */
  get(): Promise<Subscription>;
  /** `POST /me/subscription/portal`: a one-time link to the web billing portal. */
  portalUrl(): Promise<string>;
}
