/**
 * Public API of the `payment` feature. Today: the Teleport paywall, as a screen
 * only — purchase (StoreKit / Play Billing) is not built (API map §12).
 */

export {
  TeleportPaywallScreen,
  type TeleportPaywallScreenProps,
} from './presentation/screens/TeleportPaywallScreen';
export { paymentRoutes } from './presentation/navigation/routes';
