/**
 * Reading what a push carries, without depending on expo-notifications' types,
 * so it can be tested as plain data.
 *
 * The API sends the inbox item's `data` (`kind`, usually `postId`; spec §2.10),
 * but where it lands in the notification object depends on the platform and on
 * how the server builds the message:
 *
 *   - Android (FCM): the message's data map, copied to `content.data`; also on
 *     `trigger.remoteMessage.data`.
 *   - iOS (APNs): expo-notifications fills `content.data` only from a `body`
 *     key (the Expo push service's convention). A server that sends its keys
 *     beside `aps`, as APNs and FCM-for-iOS normally do, leaves `content.data`
 *     empty and the keys on `trigger.payload`.
 *   - Some senders nest the keys under `data` or `body`, sometimes as a JSON string.
 *
 * So this looks in each place in turn and takes the first that has anything.
 */

/** A push, reduced to what the app routes on. */
export type PushMessage = {
  /** The OS's id for this notification; used so one tap is handled once. */
  id: string;
  /** The inbox item's `data`: `kind`, usually `postId`, sometimes `conversationId`. */
  data: Record<string, unknown>;
};

/** The parts of an expo-notifications `Notification` this reads. */
export type RawNotification = {
  request?: {
    identifier?: string;
    content?: { data?: unknown } | null;
    trigger?: unknown;
  } | null;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** An object, or a JSON string of one (FCM data values are always strings). */
function objectOf(v: unknown): Record<string, unknown> | null {
  if (isPlainObject(v)) return v;
  if (typeof v === 'string' && v.trimStart().startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(v);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** The app's keys from one candidate place, with APNs' own `aps` dropped and nesting undone. */
function keysFrom(source: unknown): Record<string, unknown> | null {
  const outer = objectOf(source);
  if (!outer) return null;
  const wrapper = objectOf(outer.data) ? 'data' : objectOf(outer.body) ? 'body' : null;
  const nested = wrapper ? objectOf(outer[wrapper]) : null;
  const flat: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(outer)) {
    // `aps` is Apple's own (alert, sound); the wrapper's keys are merged in below.
    if (k === 'aps' || k === wrapper) continue;
    flat[k] = v;
  }
  const merged = nested ? { ...flat, ...nested } : flat;
  return Object.keys(merged).length > 0 ? merged : null;
}

/** The data a push carries, wherever the platform put it; `{}` when it carries none. */
export function pushDataOf(notification: RawNotification | null | undefined): Record<string, unknown> {
  const request = notification?.request;
  const trigger = isPlainObject(request?.trigger) ? request.trigger : {};
  const remote = isPlainObject(trigger.remoteMessage) ? trigger.remoteMessage : {};
  return keysFrom(request?.content?.data) ?? keysFrom(trigger.payload) ?? keysFrom(remote.data) ?? {};
}

export function pushMessageOf(notification: RawNotification | null | undefined): PushMessage {
  return {
    id: notification?.request?.identifier ?? '',
    data: pushDataOf(notification),
  };
}
