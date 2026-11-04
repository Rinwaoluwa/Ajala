/**
 * An entry in the person's notifications list (Figma Notifications): what
 * happened, to which post or from whom, and whether it has been seen.
 */
export type NotificationKind = 'requestApproved' | 'message' | 'reminder' | 'joinRequest' | 'postUpdated';

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** ISO date-time. */
  at: string;
  read: boolean;
  /** For a message: who sent it. */
  avatarUrl: string | null;
  /** The post it is about, when there is one; tapping opens it. */
  postId: string | null;
};

export type NotificationFilter = 'all' | 'unread';
