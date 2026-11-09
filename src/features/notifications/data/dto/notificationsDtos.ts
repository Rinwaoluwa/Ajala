/** Wire shapes for the inbox (spec §6: `NotificationDto`, `InboxPageDto`, `MarkReadDto`). */

/**
 * Swagger's `NotificationDto.category` (spec §2.17). `new_message` is no
 * longer one: chat messages never reach the inbox.
 */
export type NotificationCategoryDto =
  | 'join_request'
  | 'request_accepted'
  | 'post_reminder'
  | 'new_comment'
  | 'subscription'
  | 'post_update'
  | 'trusted_person'
  | 'moderation';

export interface NotificationDto {
  id: string;
  /** Typed as text: a category added to the API later must still read (as a post update). */
  category: NotificationCategoryDto | (string & Record<never, never>);
  title: string;
  body: string;
  /**
   * What to open, as string values; the same payload a push carries (spec
   * §2.10, §2.17). `kind` is always there (`rsvp.requested`, `post.reminder`,
   * `comment.new` + `commentId`, `trusted.plans` + `linkId`…), with `postId`
   * on everything about a post.
   */
  data: { kind?: string; postId?: string; commentId?: string; linkId?: string; [k: string]: unknown } | null;
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
