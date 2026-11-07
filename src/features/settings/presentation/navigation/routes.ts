/**
 * Where Settings lives in the route tree (`app/(app)/settings/`).
 *
 * This is past the architecture's ten-entry guide (ARCHITECTURE §4). The account
 * pages (email, password, connected accounts, sessions, export, delete) are the
 * natural piece to split into their own feature (spec §7 suggests
 * `features/account`) when someone has the time.
 */
export const settingsRoutes = {
  hub: '/(app)/settings',
  editProfile: '/(app)/settings/edit-profile',
  account: '/(app)/settings/account',
  changeEmail: '/(app)/settings/change-email',
  changePassword: '/(app)/settings/change-password',
  connected: '/(app)/settings/connected-accounts',
  sessions: '/(app)/settings/sessions',
  dataExport: '/(app)/settings/data-export',
  deleteAccount: '/(app)/settings/delete-account',
  drafts: '/(app)/settings/drafts',
  notifications: '/(app)/settings/notifications',
  appearance: '/(app)/settings/appearance',
  privacy: '/(app)/settings/privacy',
  safetyTips: '/(app)/settings/safety-tips',
  blocked: '/(app)/settings/blocked',
  reports: '/(app)/settings/reports',
  about: '/(app)/settings/about',
} as const;

export type SettingsDestination = keyof typeof settingsRoutes;
