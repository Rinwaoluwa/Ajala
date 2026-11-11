import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isDevFlavour } from '../config/flavour';

/**
 * The key and headers for Google's Places API (New).
 *
 * The app reuses the platform's Maps key (GOOGLE_MAPS_IOS_API_KEY /
 * GOOGLE_MAPS_ANDROID_API_KEY). Those are build-time variables, so app.config.js
 * copies them into `extra.placesKey` for the JavaScript to read here. That is
 * not a new exposure: the same key is already inside the app binary for the
 * Maps SDK.
 *
 * The keys are restricted to the app, and a REST call carries no proof of which
 * app sent it, so Google asks the caller to name itself in headers and checks
 * them against the key's restriction. A missing or wrong header is a 403.
 */

/** com.ajala.app, unless the build says otherwise. */
const DEFAULT_APP_ID = 'com.ajala.app';

/**
 * SHA-1 fingerprints (no colons) of the keys the Android app is signed with.
 * EAS signs every cloud build with the upload key; a local `expo run:android`
 * uses the debug keystore. Both must be on the Android key's restriction in
 * Google Cloud. A build can name another with GOOGLE_ANDROID_CERT_SHA1.
 */
export const ANDROID_CERT_SHA1 = {
  easUpload: 'F34FCF951A33CA087B2CF8B51A4B5989D1853B87',
  /** The "Ajala Dev" flavour's own EAS key (com.ajala.app.dev). */
  devFlavour: '502C12929C75DA4E450760C0BF586D4275ECD811',
  debug: '5E8F16062EA3CD2C4A0D547876BAA6F38CABF625',
} as const;

type PlacesExtra = {
  placesKey?: { ios?: string | null; android?: string | null } | null;
  /** Text when set. Read defensively: builds carry `{}` here when unset (see `placesCredentials`). */
  placesAndroidCert?: unknown;
};

export type PlacesCredentials = {
  key: string;
  headers: Record<string, string>;
};

/** The key and app headers for this platform, or null when this build has no key. */
export function placesCredentials(): PlacesCredentials | null {
  const config = Constants.expoConfig;
  const extra = (config?.extra ?? {}) as PlacesExtra;

  if (Platform.OS === 'ios') {
    const key = extra.placesKey?.ios?.trim();
    if (!key) return null;
    return {
      key,
      headers: {
        'X-Ios-Bundle-Identifier': config?.ios?.bundleIdentifier ?? DEFAULT_APP_ID,
      },
    };
  }

  if (Platform.OS === 'android') {
    const key = extra.placesKey?.android?.trim();
    if (!key) return null;
    // A development bundle most often runs in a debug build; anything else was
    // built by EAS. Wrong guesses still work while both fingerprints are on the key.
    // Only text counts: with no override set, the builds embed `{}` here (app.config.js
    // writes null, which the embedded config keeps as an empty object). Calling a string
    // method on it threw before any request was made, so every Android search failed.
    // The config is left as it is: changing it would change the runtime fingerprint and
    // cut the installed builds off from over-the-air updates.
    const configured =
      typeof extra.placesAndroidCert === 'string' ? extra.placesAndroidCert.replace(/:/g, '').trim() : '';
    const cert =
      configured ||
      // In code, not in the app config: a config change alters the runtime fingerprint
      // and an update could no longer reach the build.
      (__DEV__ ? ANDROID_CERT_SHA1.debug : isDevFlavour ? ANDROID_CERT_SHA1.devFlavour : ANDROID_CERT_SHA1.easUpload);
    return {
      key,
      headers: {
        'X-Android-Package': config?.android?.package ?? DEFAULT_APP_ID,
        'X-Android-Cert': cert.toUpperCase(),
      },
    };
  }

  // The web build has no app-restricted key to use.
  return null;
}
