import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { DEMO_MODE } from '../demo/demoMode';

/**
 * Where the phone is, and whether the app may ask. The only file that imports
 * `expo-location`.
 *
 * "While using the app" (foreground) only: nothing in Ajala needs the location in
 * the background, and asking for more than that makes people say no.
 *
 * Every call is best effort and resolves rather than throwing: a location that
 * cannot be read is something a screen shows ("search instead"), not a crash.
 */

export type LocationPermission =
  /** Granted while using the app (precise or approximate). */
  | 'granted'
  /** Never asked: the system prompt can be shown. */
  | 'undetermined'
  /** Refused, but the system will still show its prompt again (Android). */
  | 'deniedCanAsk'
  /** Refused for good: only Settings can change it. */
  | 'blocked';

export type Coordinates = { lat: number; lng: number };

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  if (response.status === Location.PermissionStatus.UNDETERMINED) return 'undetermined';
  return response.canAskAgain ? 'deniedCanAsk' : 'blocked';
}

export async function getLocationPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.getForegroundPermissionsAsync());
  } catch {
    return 'blocked';
  }
}

/** Shows the system prompt where the system still allows one. */
export async function requestLocationPermission(): Promise<LocationPermission> {
  try {
    return toPermission(await Location.requestForegroundPermissionsAsync());
  } catch {
    return 'blocked';
  }
}

/**
 * The current position at city accuracy — the app resolves it to a city, so a
 * GPS fix would only cost time and battery. The last known position answers at
 * once when there is a recent one; otherwise a fresh fix, given `timeoutMs`.
 */
export async function getCurrentCoordinates(timeoutMs = 8000): Promise<Coordinates | null> {
  // The demo's posts are all in Lagos: a demo build tested anywhere else would show an
  // empty feed and map, so it stands the phone in Victoria Island instead.
  if (DEMO_MODE) return DEMO_POSITION;
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 10 * 60 * 1000 });
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };

    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    return fix ? { lat: fix.coords.latitude, lng: fix.coords.longitude } : null;
  } catch {
    return null;
  }
}

/** Where a demo build says the phone is (Victoria Island, Lagos), as docs/DEMO.md suggests for the simulator. */
const DEMO_POSITION: Coordinates = { lat: 6.4281, lng: 3.4219 };

/** This app's page in the system Settings, where a blocked permission is turned back on. */
export function openAppSettings(): void {
  void Linking.openSettings().catch(() => undefined);
}

/**
 * `X-Client-Location` for the feed, map and explore calls (spec §2.11): "lat,lng"
 * rounded to 3 decimals (about 100 m) — enough to pick the city and the
 * distances, without sending a precise fix. Null without permission or a fix.
 */
export async function getClientLocationHeader(): Promise<Record<string, string> | null> {
  if ((await getLocationPermission()) !== 'granted') return null;
  const coords = await getCurrentCoordinates();
  return coords ? { 'X-Client-Location': `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` } : null;
}

/**
 * Where a typed place is ("Eko Convention Centre, Lagos"), by the platform's own
 * geocoder (Apple's on iOS, Google Play services' on Android) — the pin a post
 * needs (spec §2.12), without a places SDK. The first match wins; null when the
 * place cannot be found or the geocoder is unreachable.
 */
export async function geocodePlace(text: string): Promise<Coordinates | null> {
  const query = text.trim();
  if (!query) return null;
  try {
    const [first] = await Location.geocodeAsync(query);
    return first ? { lat: first.latitude, lng: first.longitude } : null;
  } catch {
    return null;
  }
}
