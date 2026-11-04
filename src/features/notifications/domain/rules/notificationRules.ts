import type { AppNotification, NotificationFilter } from '../entities/Notification';

/** Newest first, optionally only the unread. */
export function visibleNotifications(list: readonly AppNotification[], filter: NotificationFilter) {
  return list
    .filter((n) => filter === 'all' || !n.read)
    .slice()
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** "2m", "1h", "1d", "3w" — the design's short times. */
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
