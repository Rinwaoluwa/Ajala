import { appPathForLink } from '@core/config/links';

/**
 * Turns an incoming share link into the app's own route before the router sees
 * it. People share `https://<links host>/posts/{id}` and `/users/{id}` (backend
 * answers D3); the screens live at `/post/[id]` and `/user/[id]`. Every other
 * path is passed through untouched (`appPathForLink`).
 *
 * The links host comes from `EXPO_PUBLIC_LINKS_HOST` (src/core/config/links.ts).
 * A tap on a link only reaches here in a build that claims that host — the
 * associated domains and intent filters from app.config.js, which on iOS needs
 * a paid Apple Developer team.
 *
 * Someone signed out lands on the same route and the (app) layout sends them to
 * sign in, as with any other screen inside the app; the link is not kept for
 * after they have.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // A throw here can crash the app at launch, so any surprise falls back to the
  // path as it came.
  try {
    return appPathForLink(path);
  } catch {
    return path;
  }
}
