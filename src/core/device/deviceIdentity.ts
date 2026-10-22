import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * This install's identity, as the API's session endpoints want it.
 *
 * `deviceId` is stable for the life of the install: the API replaces a device's
 * previous session when the same id signs in again, so a fresh id on every launch
 * would leave a trail of orphaned sessions in the user's "signed-in devices" list.
 *
 * It is a random value, not a hardware identifier — those are restricted on both
 * platforms and would follow the person across apps. It lives in AsyncStorage
 * rather than the secure store because it is not a secret and is needed on every
 * launch; losing it costs one extra row in that list, nothing more.
 */

const DEVICE_ID_KEY = 'ajala.device.id.v1';

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
    const created = `${Platform.OS}-${Crypto.randomUUID()}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, created);
    cachedId = created;
    return created;
  } catch {
    // Storage failed. A per-process id still lets the request through; the cost
    // is a duplicate row in the sessions list, which beats blocking sign-in.
    cachedId = cachedId ?? `${Platform.OS}-${Crypto.randomUUID()}`;
    return cachedId;
  }
}

/**
 * The API's limits on these fields (`docs/api/ajala-api-users-common.md` §4,
 * `OtpVerifyDto` and friends). It refuses the whole request when one is over, so
 * a long device name would block sign-in for a reason the person cannot see.
 */
const DEVICE_NAME_MAX = 120;
const TIMEZONE_MAX = 64;

/** What the person will see in "devices signed in to my account". */
export function getDeviceName(): string {
  const named = Constants.deviceName?.trim();
  // Cut rather than dropped: a shortened "Ada's iPhone…" still identifies the phone.
  if (named) return named.slice(0, DEVICE_NAME_MAX);
  return Platform.OS === 'ios' ? 'iPhone' : 'Android device';
}

/** IANA zone, which the API stores to time reminders later. */
export function getTimezone(): string | undefined {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // A truncated zone name would be a wrong zone; better none than a wrong one.
    return zone && zone.length <= TIMEZONE_MAX ? zone : undefined;
  } catch {
    return undefined;
  }
}
