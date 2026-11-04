/**
 * Public API of the `payment` feature. Today: the Travel paywall, as a screen
 * only — purchase (StoreKit / Play Billing) is not built (API map §12) — and the
 * person's plan (`useSubscription`), always free until purchase is built.
 */

export {
  TravelPaywallScreen,
  type TravelPaywallScreenProps,
} from './presentation/screens/TravelPaywallScreen';
export { paymentRoutes } from './presentation/navigation/routes';
export { useSubscription } from './presentation/hooks/useSubscription';
export type { SubscriptionTier } from './domain/entities/Subscription';
