/**
 * The notifications feature's TanStack Query keys (spec §7: `['notifications', unread]`).
 * All and Unread are separate server-filtered lists. The Home bell reads the
 * badge from the All list's first page, so it shares that cache with the screen.
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  inbox: (unread: boolean) => ['notifications', unread] as const,
};
