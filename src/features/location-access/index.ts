/**
 * Public API of the `location-access` feature: whether Ajala may use the
 * phone's location, and the screen that asks for it.
 */

export { LocationGate } from './presentation/components/LocationGate';
export {
  LocationAccessScreen,
  type LocationAccessScreenProps,
} from './presentation/screens/LocationAccessScreen';
export { useLocationAccess } from './presentation/hooks/useLocationAccess';
export type { LocationAccess } from './domain/LocationAccess';
