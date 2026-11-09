import {
  NOTIFICATION_KINDS,
  type AppNotification,
  type NotificationKind,
  type NotificationTarget,
  type NotificationsPage,
} from '../entities/Notification';

/** How many notifications each request asks for. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * Each `data.kind` Swagger documents, and the category it belongs to (spec
 * §2.17). A push carries the kind; the inbox row carries both.
 */
const CATEGORY_OF_KIND: Readonly<Record<string, NotificationKind>> = {
  'rsvp.requested': 'join_request',
  'rsvp.accepted': 'request_accepted',
  'rsvp.promoted': 'post_update',
  'rsvp.removed': 'post_update',
  'post.cancelled': 'post_update',
  'post.taken_down': 'post_update',
  'post.details_changed': 'post_update',
  'post.reminder': 'post_reminder',
  'comment.new': 'new_comment',
  'subscription.ending': 'subscription',
  'moderation.warning': 'moderation',
  'trusted.request': 'trusted_person',
  'trusted.plans': 'trusted_person',
  'trusted.accepted': 'trusted_person',
  'trusted.ended': 'trusted_person',
  'trusted.reminder': 'trusted_person',
};

const isKind = (v: string): v is NotificationKind => (NOTIFICATION_KINDS as readonly string[]).includes(v);

/**
 * The category of an inbox item or a push: its `category` when it is one this
 * build knows, else what its `data.kind` belongs to (a `trusted.*` kind this
 * build has not met still reads as `trusted_person`), else `post_update`, so
 * anything new still shows and a `postId` on it still opens.
 */
export function kindOf(category: string | null, dataKind: string | null): NotificationKind {
  if (category && isKind(category)) return category;
  if (dataKind) {
    const known = CATEGORY_OF_KIND[dataKind];
    if (known) return known;
    // A push that names its category in `kind` (as older senders did) says it plainly.
    if (isKind(dataKind)) return dataKind;
    if (dataKind.startsWith('trusted.')) return 'trusted_person';
  }
  return 'post_update';
}

/**
 * Where a tap goes. A subscription notice opens the Travel paywall, and
 * anything about a post opens the post (a changed time or place included). The
 * rest has nowhere to go yet, so the row only marks itself read: a moderation
 * warning, and the trusted-person ones ("Share my plan"), whose screens are not
 * built; they carry a `linkId` for when they are.
 *
 * It reads only what a push carries too, so a tapped push goes to the same
 * place as its inbox row (`pushOpenOf`). Chat messages never reach the inbox;
 * their pushes are routed in `pushOpenOf`.
 */
export function targetOf(n: Pick<AppNotification, 'kind' | 'postId'>): NotificationTarget {
  if (n.kind === 'subscription') return { to: 'paywall' };
  if (n.kind === 'trusted_person' || n.kind === 'moderation') return null;
  if (n.postId) return { to: 'post', postId: n.postId };
  return null;
}

/**
 * The cached pages after marking `ids` read (all of them when `ids` is null),
 * so the list and the badge change before the server answers. The unread count
 * drops by the number of rows that actually changed; marking everything read
 * sets it to zero even for rows not loaded yet.
 */
export function markPagesRead(
  pages: readonly NotificationsPage[],
  ids: readonly string[] | null,
): NotificationsPage[] {
  const only = ids ? new Set(ids) : null;
  const changed = new Set<string>();
  const next = pages.map((p) => ({
    ...p,
    items: p.items.map((n) => {
      if (n.read || (only && !only.has(n.id))) return n;
      changed.add(n.id);
      return { ...n, read: true };
    }),
  }));
  return next.map((p) => ({
    ...p,
    unreadCount: only ? Math.max(0, p.unreadCount - changed.size) : 0,
  }));
}

/** "2m", "1h", "1d", "3w": the design's short times. */
export function shortAgo(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000));
  if (Number.isNaN(minutes)) return '';
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}
