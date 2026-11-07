import type { AppNotification, NotificationKind } from '../entities/Notification';
import type {
  DeviceIdentity,
  DevicePushToken,
  DeviceRegistration,
  PushOpen,
  PushPermissionStatus,
} from '../entities/PushDevice';
import { targetOf } from './notificationRules';

/**
 * The API's limits on `RegisterDeviceDto` (spec §4). It refuses the whole
 * request when a field is over, so each is checked here first.
 */
export const PUSH_TOKEN_MAX = 512;
export const DEVICE_ID_MAX = 128;
export const TIMEZONE_MAX = 64;

/**
 * The body for `POST /me/devices`, or null when there is nothing worth sending.
 *
 * The token and device id can't be cut (a cut token reaches nobody, a cut id is
 * another device), so either one out of bounds means no registration. A zone
 * that is too long is left out instead: the API takes the registration without
 * one, and a wrong zone would time reminders wrongly.
 */
export function buildDeviceRegistration(
  push: DevicePushToken,
  identity: DeviceIdentity,
): DeviceRegistration | null {
  const token = push.token.trim();
  const deviceId = identity.deviceId.trim();
  if (!token || token.length > PUSH_TOKEN_MAX) return null;
  if (!deviceId || deviceId.length > DEVICE_ID_MAX) return null;
  if (push.platform !== 'ios' && push.platform !== 'android') return null;
  const timezone = identity.timezone?.trim();
  return {
    token,
    platform: push.platform,
    deviceId,
    ...(timezone && timezone.length <= TIMEZONE_MAX ? { timezone } : {}),
  };
}

/**
 * Whether to show the system prompt now. Only when the person has never
 * answered and this install hasn't asked before: a "no" is respected, and so
 * is a prompt dismissed without an answer (Android 13 allows that). Someone who
 * later turns notifications on in the phone's settings comes back as granted,
 * and is registered then without being asked.
 */
export function shouldAskForPushPermission(status: PushPermissionStatus, alreadyAsked: boolean): boolean {
  return status === 'undetermined' && !alreadyAsked;
}

const KINDS: readonly NotificationKind[] = [
  'join_request',
  'request_accepted',
  'post_reminder',
  'new_comment',
  'new_message',
  'subscription',
  'post_update',
  'moderation',
];

/**
 * `data.kind` is not pinned down by the spec (backend-requests B6). These are
 * the other spellings seen so far (the demo's), read as the category they mean.
 */
const KIND_ALIASES: Readonly<Record<string, NotificationKind>> = {
  message: 'new_message',
  comment: 'new_comment',
  post_updated: 'post_update',
  report_resolved: 'moderation',
};

const text = (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);

/**
 * A push's `data` read as the inbox item it mirrors, enough for `targetOf`.
 * A `category` wins over `kind` when a push carries both; a conversation id
 * marks a message even when the kind is unfamiliar; anything else unknown
 * reads as a post update, as it does in the inbox, so a `postId` still opens.
 */
export function pushNotificationOf(
  data: Readonly<Record<string, unknown>>,
): Pick<AppNotification, 'kind' | 'postId' | 'conversationId'> {
  const raw = text(data.category) ?? text(data.kind);
  const conversationId = text(data.conversationId);
  const known = raw && (KINDS as readonly string[]).includes(raw) ? (raw as NotificationKind) : null;
  const kind = known ?? (raw ? KIND_ALIASES[raw] : undefined) ?? (conversationId ? 'new_message' : 'post_update');
  return { kind, postId: text(data.postId), conversationId };
}

/**
 * What tapping a push does: the same place the inbox row would open, and the
 * inbox item to mark read when the push names it (`notificationId`, which the
 * spec doesn't promise yet; without it the inbox is only refreshed).
 */
export function pushOpenOf(data: Readonly<Record<string, unknown>>): PushOpen {
  return {
    target: targetOf(pushNotificationOf(data)),
    notificationId: text(data.notificationId),
  };
}
