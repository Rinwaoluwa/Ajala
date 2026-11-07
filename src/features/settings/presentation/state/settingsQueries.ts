/**
 * Settings' TanStack Query keys, under `settings` so they never meet another
 * feature's. `GET /me` is read here into Settings' own shape under its own key;
 * after an edit the shared `me` key is invalidated so other features refetch it
 * in theirs (one key, one shape).
 */
export const settingsKeys = {
  account: ['settings', 'account'] as const,
  preferences: ['settings', 'preferences'] as const,
  sessions: ['settings', 'sessions'] as const,
  drafts: ['settings', 'drafts'] as const,
  blocked: ['settings', 'blocked'] as const,
  support: ['settings', 'support'] as const,
  reports: ['settings', 'reports'] as const,
  dataExport: ['settings', 'export'] as const,
  popularCities: ['settings', 'popularCities'] as const,
  handle: (handle: string) => ['settings', 'handle', handle] as const,
  cities: (query: string) => ['settings', 'cities', query] as const,
};
