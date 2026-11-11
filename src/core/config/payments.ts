/**
 * Where people pay for Travel: a web page opened in the phone's default browser,
 * outside the app (11 Nov 2026). Stripe checkout inside the app is switched off.
 *
 * Set per environment as `EXPO_PUBLIC_SUBSCRIBE_URL` (EAS environment variables,
 * and `.env.local` for a laptop build). Null when unset: the paywall then says
 * buying isn't available yet rather than opening nothing.
 *
 * Written out as `process.env.EXPO_PUBLIC_SUBSCRIBE_URL` in full: Expo only
 * inlines public variables it can see by name.
 */
export const WEB_SUBSCRIBE_URL: string | null = (() => {
  const url = process.env.EXPO_PUBLIC_SUBSCRIBE_URL?.trim();
  return url && /^https:\/\//i.test(url) ? url : null;
})();
