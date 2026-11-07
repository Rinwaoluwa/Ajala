/** Wire shapes for the inbox (spec §6: `NotificationDto`, `InboxPageDto`, `MarkReadDto`). */

export type NotificationCategoryDto =
  | 'join_request'
  | 'request_accepted'
  | 'post_reminder'
  | 'new_comment'
  | 'new_message'
  | 'subscription'
  | 'post_update'
  | 'moderation';

export interface NotificationDto {
  id: string;
  category: NotificationCategoryDto;
  title: string;
  body: string;
  /** What to open: `kind` and usually `postId`; the same payload a push carries (spec §2.10). */
  data: { kind?: string; postId?: string; [k: string]: unknown } | null;
  readAt: string | null;
  createdAt: string;
}

export interface InboxPageDto {
  items: NotificationDto[];
  nextCursor: string | null;
  /** The whole inbox's unread count, for the badge. */
  unreadCount: number;
}

export interface MarkReadDto {
  /** Omit to mark everything read. */
  ids?: string[];
}

/** `POST /me/devices` (spec §2.10, §4 limits). Registers or refreshes this phone's push token. */
export interface RegisterDeviceDto {
  /** The native push token (the spec says "FCM token"; see the README's Push section). ≤ 512. */
  token: string;
  platform: 'ios' | 'android';
  /** Firebase's app instance id. Not sent: the app has no Firebase SDK to read it from. ≤ 64. */
  appInstanceId?: string;
  /** IANA zone; push reminders are timed by it. ≤ 64. */
  timezone?: string;
  /** The same id as at sign-in, so the device keeps its pushes across sessions. ≤ 128. */
  deviceId?: string;
}

/** `POST /me/devices/unregister`. */
export interface UnregisterDeviceDto {
  token: string;
}
