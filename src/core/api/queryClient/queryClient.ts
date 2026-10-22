import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

/**
 * The app's one TanStack Query client: the cache every screen reads the API
 * through.
 *
 * Defaults, and why:
 *   - `retry: false` — `apiClient` already retries a GET that dropped or got a
 *     500/503, with backoff (spec §5); a second layer would multiply the waits.
 *     Mutations are never retried (a POST may have landed).
 *   - `staleTime` one minute — screens revisited within it draw from the cache
 *     with no request; after it, they show the cache and refresh behind it.
 *   - `gcTime` ten minutes — how long an unused answer is kept.
 *   - Returning to the app counts as "window focus", so stale screens refresh
 *     when someone comes back (React Native has no window to focus).
 *
 * Signing out clears it (auth's provider), so nothing of one account is shown to
 * the next (spec §7).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 60_000, gcTime: 10 * 60_000, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
  return () => subscription.remove();
});

/** Keys shared across features. A feature's own keys live with that feature. */
export const sharedQueryKeys = {
  /** `GET /me` — the signed-in account, as profile setup and the profile read it. */
  me: ['me'] as const,
};
