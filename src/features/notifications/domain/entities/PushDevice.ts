import type { PushTarget } from './Notification';

/**
 * This phone as a push destination (spec §2.10): its token, and what the API
 * stores alongside it.
 */

export type PushPlatform = 'ios' | 'android';

/** The OS's push token for this install: FCM on Android, APNs on iOS. */
export type DevicePushToken = { token: string; platform: PushPlatform };

/** The install's identity, as sign-in sent it. */
export type DeviceIdentity = {
  /** The same id sign-in sends, so the API ties the token to this device's sessions. */
  deviceId: string;
  /** IANA zone, or null when the phone wouldn't say. */
  timezone: string | null;
};

/** Exactly what `POST /me/devices` gets. */
export type DeviceRegistration = {
  token: string;
  platform: PushPlatform;
  deviceId: string;
  timezone?: string;
};

/** The notification permission, as far as deciding whether to ask goes. */
export type PushPermissionStatus = 'granted' | 'denied' | 'undetermined';

/** What tapping a push does: where it goes, and which inbox item to mark read when the push names one. */
export type PushOpen = {
  target: PushTarget;
  notificationId: string | null;
};
