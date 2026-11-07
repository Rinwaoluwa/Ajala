/**
 * Public API of the `payment` feature: the Travel paywall, and the person's
 * subscription (`useSubscription`, from `GET /me/subscription`) that gates
 * teleport. Buying is not in this build yet (see the README).
 */

export {
  TravelPaywallScreen,
  type TravelPaywallScreenProps,
} from './presentation/screens/TravelPaywallScreen';
export { paymentRoutes } from './presentation/navigation/routes';
export { useSubscription } from './presentation/hooks/useSubscription';
export type { Subscription, SubscriptionTier } from './domain/entities/Subscription';
