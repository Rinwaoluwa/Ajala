/** Where Settings lives in the route tree (`app/(app)/settings/`). */
export const settingsRoutes = {
  hub: '/(app)/settings',
  editProfile: '/(app)/settings/edit-profile',
  account: '/(app)/settings/account',
  changeEmail: '/(app)/settings/change-email',
  changePassword: '/(app)/settings/change-password',
  connected: '/(app)/settings/connected-accounts',
  sessions: '/(app)/settings/sessions',
  deleteAccount: '/(app)/settings/delete-account',
  drafts: '/(app)/settings/drafts',
  notifications: '/(app)/settings/notifications',
  appearance: '/(app)/settings/appearance',
  privacy: '/(app)/settings/privacy',
  safetyTips: '/(app)/settings/safety-tips',
  blocked: '/(app)/settings/blocked',
  about: '/(app)/settings/about',
} as const;

export type SettingsDestination = keyof typeof settingsRoutes;
