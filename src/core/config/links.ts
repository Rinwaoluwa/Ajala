/**
 * Share links: `https://<links host>/posts/{id}` and `/users/{id}` (backend
 * answers D3). The app builds them itself; the links host serves the Apple and
 * Android verification files, so a tap opens the app where it is installed and
 * a "Get the app" page where it isn't.
 *
 * The host differs per environment, so it comes from `EXPO_PUBLIC_LINKS_HOST`
 * (production `go.ajalatrvl.com`, the default; development
 * `dev-go.ajalatrvl.com`; staging `staging-go.ajalatrvl.com`). app.config.js
 * reads the same variable for the iOS associated domains and the Android intent
 * filters, so the links a build shares are the ones it opens.
 *
 * Written out as `process.env.EXPO_PUBLIC_LINKS_HOST` in full: Expo only
 * inlines public variables spelled that way.
 */
export const DEFAULT_LINKS_HOST = 'go.ajalatrvl.com';

export const LINKS_HOST = process.env.EXPO_PUBLIC_LINKS_HOST?.trim() || DEFAULT_LINKS_HOST;

export const LINKS_ORIGIN = `https://${LINKS_HOST}`;

/**
 * Where an incoming link should land in the app, for `app/+native-intent.tsx`.
 *
 * A shared link says `/posts/{id}` and `/users/{id}`; the app's routes are
 * `/post/[id]` and `/user/[id]`. Those two are rewritten; anything else —
 * another path, another website, an OAuth return — comes back unchanged, so
 * the router handles it as it would have.
 *
 * It takes a bare path, an `https://` link (only on the links host: the app is
 * never meant to open some other site's `/posts/...`), or the app's own scheme
 * (`ajala://posts/{id}`, where the first segment arrives as the URL's host).
 * A query string or fragment, such as a tracking tag, is dropped.
 */
export function appPathForLink(url: string, linksHost: string = LINKS_HOST): string {
  let path = url;
  const withScheme = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(.*)$/i.exec(url);
  if (withScheme) {
    const [, scheme, host, rest] = withScheme;
    if (/^https?$/i.test(scheme)) {
      if (host.toLowerCase() !== linksHost.toLowerCase()) return url;
      path = rest;
    } else {
      path = host ? `/${host}${rest}` : rest;
    }
  }

  const match = /^\/(posts|users)\/([^/?#]+)\/?(?:[?#].*)?$/.exec(path);
  if (!match) return url;
  const [, kind, id] = match;
  return `/${kind === 'posts' ? 'post' : 'user'}/${id}`;
}
