import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { pushMessageOf, type PushMessage } from './pushPayload';

/**
 * The one file that talks to expo-notifications: permission, the device's push
 * token, and the listeners for pushes arriving and being tapped. Features get
 * plain values and unsubscribe functions, never the SDK's types.
 *
 * Everything here is best effort. A simulator without APNs, an Android build
 * without google-services.json, or a refused permission all mean "no push",
 * never a crash: failures are logged in development builds and read as null.
 */

export type { PushMessage } from './pushPayload';

export type PushPlatform = 'ios' | 'android';

/**
 * The native token: FCM on Android, APNs on iOS (not an Expo push token; the
 * API sends through Firebase/APNs itself). Which one iOS should send is an open
 * question to the backend (docs/api/backend-requests.md A13).
 */
export type PushToken = { token: string; platform: PushPlatform };

/** `undetermined`: never answered, so asking would show the system prompt. */
export type PushPermission = 'granted' | 'denied' | 'undetermined';

/**
 * Android's channel for every push. It must match `defaultChannel` in the
 * expo-notifications plugin (app.config.js), which FCM uses for messages that
 * name no channel.
 */
const ANDROID_CHANNEL_ID = 'default';
const BRAND_TEAL = '#0E6F69';

/** Whether this install has shown the permission prompt; see `wasAskedForPushPermission`. */
const ASKED_KEY = 'ajala.push.asked.v1';

const platform = (): PushPlatform | null =>
  Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;

function devLog(what: string, error?: unknown) {
  if (!__DEV__) return;
  console.warn(`[push] ${what}`, error instanceof Error ? error.message : (error ?? ''));
}

let setup: Promise<void> | null = null;

/**
 * Once per launch, before anything else here: how a push that arrives while the
 * app is open is shown, and (Android) the channel pushes go to. Android 13 only
 * shows the permission prompt once a channel exists, so this goes first.
 */
export function configurePush(): Promise<void> {
  setup ??= (async () => {
    // In the foreground too: a banner and a place in Notification Centre. The
    // app's own badge is the inbox count, so the OS badge is left alone.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: BRAND_TEAL,
      });
    }
  })().catch((e) => devLog('setup failed', e));
  return setup;
}

function toPermission(p: Notifications.NotificationPermissionsStatus): PushPermission {
  const iosStatus = p.ios?.status;
  // Provisional (quiet delivery) and ephemeral (App Clips) still deliver pushes.
  if (
    p.granted ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  if (p.status === 'denied' || !p.canAskAgain) return 'denied';
  return 'undetermined';
}

/** The current answer, without asking. A failure reads as denied, so nothing prompts on it. */
export async function getPushPermission(): Promise<PushPermission> {
  if (!platform()) return 'denied';
  try {
    return toPermission(await Notifications.getPermissionsAsync());
  } catch (e) {
    devLog('permission check failed', e);
    return 'denied';
  }
}

/** Shows the system prompt (Android 13+: POST_NOTIFICATIONS) and returns the answer. */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!platform()) return 'denied';
  try {
    return toPermission(
      await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      }),
    );
  } catch (e) {
    devLog('permission request failed', e);
    return 'denied';
  }
}

/**
 * Whether this install has already asked. Android 13 lets a prompt be dismissed
 * without an answer, which leaves the permission undetermined; without this the
 * app would ask again on every launch.
 */
export async function wasAskedForPushPermission(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
  } catch {
    // Unknown: say yes, so a storage fault can't turn into a prompt every launch.
    return true;
  }
}

export async function markAskedForPushPermission(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, '1');
  } catch {
    // At worst the person is asked once more.
  }
}

/** This device's push token, or null when there is none to be had (see the file comment). */
export async function getPushToken(): Promise<PushToken | null> {
  const os = platform();
  if (!os) return null;
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    return typeof data === 'string' && data.length > 0 ? { token: data, platform: os } : null;
  } catch (e) {
    devLog('no push token', e);
    return null;
  }
}

/** Calls `listener` when the OS hands out a new token (a reinstall, a restore, FCM rotating it). */
export function onPushTokenChange(listener: (token: PushToken) => void): () => void {
  const os = platform();
  if (!os) return () => undefined;
  const sub = Notifications.addPushTokenListener(({ data }) => {
    if (typeof data === 'string' && data.length > 0) listener({ token: data, platform: os });
  });
  return () => sub.remove();
}

/** A push arrived while the app was open (it is also shown; see `configurePush`). */
export function onPushReceived(listener: (message: PushMessage) => void): () => void {
  if (!platform()) return () => undefined;
  const sub = Notifications.addNotificationReceivedListener((n) => listener(pushMessageOf(n)));
  return () => sub.remove();
}

/** The person tapped a push (not an action button) while the app was running or in the background. */
export function onPushOpened(listener: (message: PushMessage) => void): () => void {
  if (!platform()) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    listener(pushMessageOf(response.notification));
  });
  return () => sub.remove();
}

/**
 * The push whose tap opened the app from closed, if any. It is cleared once
 * read, so signing out and in again doesn't open the same thing twice.
 */
export async function takeLaunchPush(): Promise<PushMessage | null> {
  if (!platform()) return null;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return null;
    await Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    return pushMessageOf(response.notification);
  } catch (e) {
    devLog('launch push unreadable', e);
    return null;
  }
}

const opened = new Set<string>();

/**
 * True the first time a given push is seen as opened, false after. The launch
 * response and the tap listener can both report the same tap.
 */
export function claimOpenedPush(message: PushMessage): boolean {
  if (!message.id) return true;
  if (opened.has(message.id)) return false;
  opened.add(message.id);
  return true;
}
