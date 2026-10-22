/**
 * Public API of the `profile` feature.
 *
 * This file is the ONLY entry point other features and the `app/` route tree may
 * import from. Today that is profile setup (after sign-up, until `GET /me` has a
 * `profileCompletedAt`); the profile screens themselves come later.
 */

export { ProfileSetupProvider } from './presentation/state/ProfileSetupContext';
export { ProfileSetupGate } from './presentation/components/ProfileSetupGate';
export {
  ProfileBasicsScreen,
  type ProfileBasicsScreenProps,
} from './presentation/screens/ProfileBasicsScreen';
export { CitySearchScreen } from './presentation/screens/CitySearchScreen';
export { TravelStyleScreen } from './presentation/screens/TravelStyleScreen';
export { DestinationsScreen } from './presentation/screens/DestinationsScreen';
export { InterestsScreen } from './presentation/screens/InterestsScreen';
export { SavingProfileScreen } from './presentation/screens/SavingProfileScreen';
export { DisplayNameScreen, type DisplayNameScreenProps } from './presentation/screens/DisplayNameScreen';
export { BiometricSetupScreen } from './presentation/screens/BiometricSetupScreen';
export { profileSetupRoutes } from './presentation/navigation/routes';
