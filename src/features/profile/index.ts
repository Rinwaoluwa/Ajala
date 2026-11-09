/**
 * Public API of the `profile` feature.
 *
 * This file is the ONLY entry point other features and the `app/` route tree may
 * import from: profile setup (after sign-up, until `GET /me` has a
 * `profileCompletedAt`), and the profile pages — your own (the Profile tab),
 * other travellers', Saved activities and Achievements.
 */

export { ProfileSetupProvider } from './presentation/state/ProfileSetupContext';
export { ProfileSetupGate } from './presentation/components/ProfileSetupGate';
export {
  ProfileBasicsScreen,
  type ProfileBasicsScreenProps,
} from './presentation/screens/ProfileBasicsScreen';
export { TravelStyleScreen } from './presentation/screens/TravelStyleScreen';
export { DestinationsScreen } from './presentation/screens/DestinationsScreen';
export { InterestsScreen } from './presentation/screens/InterestsScreen';
export { SavingProfileScreen } from './presentation/screens/SavingProfileScreen';
export { DisplayNameScreen, type DisplayNameScreenProps } from './presentation/screens/DisplayNameScreen';
export { BiometricSetupScreen } from './presentation/screens/BiometricSetupScreen';
export { profileSetupRoutes, profileRoutes } from './presentation/navigation/routes';
export { OwnProfileScreen, type OwnProfileScreenProps } from './presentation/screens/OwnProfileScreen';
export {
  PublicProfileScreen,
  type PublicProfileScreenProps,
} from './presentation/screens/PublicProfileScreen';
export { SavedActivitiesScreen } from './presentation/screens/SavedActivitiesScreen';
export { AchievementsScreen } from './presentation/screens/AchievementsScreen';
