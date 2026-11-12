import * as Location from 'expo-location';
import { Linking } from 'react-native';

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
  resetClientLocationHeader();
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

/** This app's page in the system Settings, where a blocked permission is turned back on. */
export function openAppSettings(): void {
  void Linking.openSettings().catch(() => undefined);
}

/**
 * `X-Client-Location` (spec §2.11): "lat,lng" rounded to 3 decimals (about
 * 100 m) — enough to pick the city and the distances, without sending a precise
 * fix. Null without permission or a fix.
 *
 * Every signed-in call sends it (`apiClient`, MOB-077): the server decides
 * which posts a free member may open by where the phone is. So one answer is
 * shared for a short while, rather than asking the phone on every request, and
 * calls made together wait on the same question.
 */
const HEADER_FRESH_MS = 60_000;
/** Without a fix, ask again sooner: permission may have just been granted. */
const NO_HEADER_FRESH_MS = 10_000;
let cachedHeader: { value: Record<string, string> | null; at: number } | null = null;
let pendingHeader: Promise<Record<string, string> | null> | null = null;

async function readClientLocationHeader(): Promise<Record<string, string> | null> {
  if ((await getLocationPermission()) !== 'granted') return null;
  const coords = await getCurrentCoordinates();
  return coords ? { 'X-Client-Location': `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` } : null;
}

export async function getClientLocationHeader(): Promise<Record<string, string> | null> {
  const now = Date.now();
  if (cachedHeader && now - cachedHeader.at < (cachedHeader.value ? HEADER_FRESH_MS : NO_HEADER_FRESH_MS)) {
    return cachedHeader.value;
  }
  pendingHeader ??= readClientLocationHeader()
    .then((value) => {
      cachedHeader = { value, at: Date.now() };
      return value;
    })
    .finally(() => {
      pendingHeader = null;
    });
  return pendingHeader;
}

/** Forgets the shared answer: after permission changes, the next call asks the phone again. */
export function resetClientLocationHeader(): void {
  cachedHeader = null;
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
