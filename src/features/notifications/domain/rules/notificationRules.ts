import type { AppNotification, NotificationTarget, NotificationsPage } from '../entities/Notification';

/** How many notifications each request asks for. */
export const NOTIFICATIONS_PAGE_SIZE = 20;

/**
 * Where a tap goes. A message opens its conversation (or Messages when the
 * server didn't say which), a subscription notice opens the Travel paywall, and
 * anything else about a post opens the post. The rest (a report reviewed) has
 * nowhere to go, so the row only marks itself read.
 *
 * It reads only what a push carries too, so a tapped push goes to the same
 * place as its inbox row (`pushOpenOf`).
 */
export function targetOf(n: Pick<AppNotification, 'kind' | 'postId' | 'conversationId'>): NotificationTarget {
  if (n.kind === 'new_message') return { to: 'messages', conversationId: n.conversationId };
  if (n.kind === 'subscription') return { to: 'paywall' };
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
