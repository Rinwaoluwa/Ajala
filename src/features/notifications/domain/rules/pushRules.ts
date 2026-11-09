import type { AppNotification } from '../entities/Notification';
import type {
  DeviceIdentity,
  DevicePushToken,
  DeviceRegistration,
  PushOpen,
  PushPermissionStatus,
} from '../entities/PushDevice';
import { kindOf, targetOf } from './notificationRules';

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

/** A chat push's `kind` (backend answers B6), the inbox category it would have had, and the demo's old spelling. */
const CHAT_KINDS = new Set(['chat.message', 'new_message', 'message']);

const text = (v: unknown) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null);

/**
 * Whether a push is about a chat message: `{ kind: 'chat.message', conversationId }`.
 * Those are push only, never in the inbox, so they open the chat and leave the
 * inbox alone. A conversation id marks one even under an unfamiliar kind.
 */
export function isChatPush(data: Readonly<Record<string, unknown>>): boolean {
  const kinds = [text(data.category), text(data.kind)];
  return kinds.some((k) => k !== null && CHAT_KINDS.has(k)) || text(data.conversationId) !== null;
}

/**
 * A push's `data` read as the inbox item it mirrors, enough for `targetOf`.
 * Pushes carry Swagger's `kind` (`rsvp.requested`, `comment.new`,
 * `trusted.plans`…); a `category` wins when one comes too. Anything unknown
 * reads as a post update, as it does in the inbox, so a `postId` still opens.
 */
export function pushNotificationOf(
  data: Readonly<Record<string, unknown>>,
): Pick<AppNotification, 'kind' | 'postId'> {
  return { kind: kindOf(text(data.category), text(data.kind)), postId: text(data.postId) };
}

/**
 * What tapping a push does. A chat message opens its conversation (Messages
 * when it names none); anything else opens what its inbox row would: a changed
 * post (`post.details_changed`) the post, a subscription notice the paywall.
 * It also names the inbox item to mark read when the push carries one
 * (`notificationId`, which the spec doesn't promise yet); a chat push never
 * does, as it has no inbox item.
 */
export function pushOpenOf(data: Readonly<Record<string, unknown>>): PushOpen {
  if (isChatPush(data)) {
    return { target: { to: 'messages', conversationId: text(data.conversationId) }, notificationId: null };
  }
  return {
    target: targetOf(pushNotificationOf(data)),
    notificationId: text(data.notificationId),
  };
}
