/**
 * An entry in the person's notifications inbox (Figma Notifications, spec §2.17):
 * what happened, what it points at, and whether it has been seen.
 */

/** The API's eight categories; each picks the row's icon. */
export type NotificationKind =
  | 'join_request'
  | 'request_accepted'
  | 'post_reminder'
  | 'new_comment'
  | 'new_message'
  | 'subscription'
  | 'post_update'
  | 'moderation';

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
  /** For a message, the conversation it came in, when the server says which. */
  conversationId: string | null;
};

/** One page of the inbox. `unreadCount` covers the whole inbox, not just this page: it is the badge. */
export type NotificationsPage = {
  items: AppNotification[];
  nextCursor: string | null;
  unreadCount: number;
};

export type NotificationFilter = 'all' | 'unread';

/** Where tapping a notification goes; `null` means it stays on the list. */
export type NotificationTarget =
  | { to: 'post'; postId: string }
  | { to: 'messages'; conversationId: string | null }
  | { to: 'paywall' }
  | null;
