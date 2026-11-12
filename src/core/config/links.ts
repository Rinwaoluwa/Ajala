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

import { flavourServers } from './flavour';
export const DEFAULT_LINKS_HOST = 'go.ajalatrvl.com';

export const LINKS_HOST =
  flavourServers().linksHost || process.env.EXPO_PUBLIC_LINKS_HOST?.trim() || DEFAULT_LINKS_HOST;

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

/**
 * Every host an Ajala share link may come from: production, staging and dev,
 * and this build's own. Someone on one build can be sent a link made on another,
 * and it is still a post or a profile in the app.
 */
const AJALA_LINK_HOSTS = ['go.ajalatrvl.com', 'staging-go.ajalatrvl.com', 'dev-go.ajalatrvl.com'];

/**
 * The app route an Ajala link opens (`/post/{id}` or `/user/{id}`), or null
 * when it is not one. Takes `https://go.ajalatrvl.com/posts/{id}` (any of the
 * three hosts, `http` or none), and the app's own schemes (`ajala://`,
 * `ajala-dev://`). Used to open a link written in a chat inside the app.
 */
export function ajalaLinkRoute(link: string): string | null {
  const url = link.trim();
  const app = /^ajala(?:-dev)?:\/\//i.test(url) ? appPathForLink(url.replace(/^ajala-dev:/i, 'ajala:')) : null;
  if (app) return app.startsWith('/post/') || app.startsWith('/user/') ? app : null;

  const web = /^(?:https?:\/\/)?([^/?#\s]+)(\/[^\s]*)?$/i.exec(url);
  if (!web) return null;
  const host = web[1].toLowerCase();
  if (host !== LINKS_HOST.toLowerCase() && !AJALA_LINK_HOSTS.includes(host)) return null;
  const route = appPathForLink(web[2] ?? '/');
  return route.startsWith('/post/') || route.startsWith('/user/') ? route : null;
}

/** A run of a message: plain words, or a link with where it goes. */
export type TextPart = { text: string; link?: { url: string; route: string | null } };

/**
 * Splits text into plain runs and links, for a message to show its links as
 * links. A link is an `http(s)://` address, an app link (`ajala://…`), or a
 * bare Ajala share link (`go.ajalatrvl.com/posts/…`). Trailing punctuation
 * ("…/posts/abc." at the end of a sentence) stays outside the link. `route`
 * is set for an Ajala post or profile, which opens in the app.
 */
export function splitLinks(text: string): TextPart[] {
  const pattern =
    /\b(?:https?:\/\/[^\s<>"]+|ajala(?:-dev)?:\/\/[^\s<>"]+|(?:(?:staging-|dev-)?go\.ajalatrvl\.com)\/[^\s<>"]+)/gi;
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const url = raw.replace(/[.,!?;:)\]}'"]+$/, '');
    if (start > last) parts.push({ text: text.slice(last, start) });
    const href = /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
    parts.push({ text: url, link: { url: href, route: ajalaLinkRoute(url) } });
    last = start + url.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
