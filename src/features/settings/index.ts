/**
 * Public API of the `settings` feature: Settings and its pages, and where they
 * live in the route tree.
 */

export { SettingsScreen, type SettingsScreenProps } from './presentation/screens/SettingsScreen';
export { EditProfileScreen } from './presentation/screens/EditProfileScreen';
export { AccountSecurityScreen } from './presentation/screens/AccountSecurityScreen';
export { ChangeEmailScreen } from './presentation/screens/ChangeEmailScreen';
export { ChangePasswordScreen } from './presentation/screens/ChangePasswordScreen';
export { ConnectedAccountsScreen } from './presentation/screens/ConnectedAccountsScreen';
export { SessionsScreen } from './presentation/screens/SessionsScreen';
export { DeleteAccountScreen } from './presentation/screens/DeleteAccountScreen';
export { DraftsScreen } from './presentation/screens/DraftsScreen';
export { NotificationSettingsScreen } from './presentation/screens/NotificationSettingsScreen';
export { AppearanceScreen } from './presentation/screens/AppearanceScreen';
export { PrivacySafetyScreen } from './presentation/screens/PrivacySafetyScreen';
export { SafetyTipsScreen } from './presentation/screens/SafetyTipsScreen';
export { BlockedAccountsScreen } from './presentation/screens/BlockedAccountsScreen';
export { AboutScreen } from './presentation/screens/AboutScreen';
export { settingsRoutes, type SettingsDestination } from './presentation/navigation/routes';
