/**
 * An entry in the person's notifications inbox (Figma Notifications, spec §2.17):
 * what happened, what it points at, and whether it has been seen.
 */

/**
 * The inbox's categories (Swagger `NotificationDto.category`, spec §2.17); each
 * picks the row's icon. `new_message` is no longer one: chat messages are never
 * in the inbox, and chat has its own badge on the Messages button. A category
 * this build doesn't know is read as `post_update`.
 */
export const NOTIFICATION_KINDS = [
  'join_request',
  'request_accepted',
  'post_reminder',
  'new_comment',
  'subscription',
  'post_update',
  /** "Share my plan": a request, an acceptance, plans updated, an ending, a reminder. */
  'trusted_person',
  'moderation',
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO date-time. */
  at: string;
  read: boolean;
  /** The post it is about, when there is one. */
  postId: string | null;
};

/** One page of the inbox. `unreadCount` covers the whole inbox, not just this page: it is the badge. */
export type NotificationsPage = {
  items: AppNotification[];
  nextCursor: string | null;
  unreadCount: number;
};

export type NotificationFilter = 'all' | 'unread';

/** Where tapping a notification goes; `null` means it stays on the list. */
export type NotificationTarget = { to: 'post'; postId: string } | { to: 'paywall' } | null;

/**
 * Where tapping a push goes: anywhere an inbox row goes, or a chat. A chat
 * push (`chat.message`) names its conversation; Messages is the fallback for
 * one that doesn't.
 */
export type PushTarget = NotificationTarget | { to: 'messages'; conversationId: string | null };
