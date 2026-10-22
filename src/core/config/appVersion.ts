import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Which build this is, and where to get a newer one — for the forced-update
 * check against `minAppVersion` from `GET /app/config`.
 *
 * The version is the marketing version (`version` in app.json, "1.0.0"), because
 * that is the form `minAppVersion` takes ("1.0.0"). The build number
 * (`CFBundleVersion` / `versionCode`) is a different, single integer and cannot be
 * compared with it.
 *
 * Read through `expo-constants`, which is already installed. `expo-application`'s
 * `nativeApplicationVersion` would read the binary's Info.plist / manifest rather
 * than the embedded app config — the two only differ if an OTA update ships a
 * changed `version`, which this project does not do. Switching is one line here
 * but adds a native module, so it is left for when EAS Update arrives.
 */

export type AppPlatform = 'ios' | 'android';

export function getAppPlatform(): AppPlatform | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

/** The installed version, or null where it cannot be known (web, a broken manifest). */
export function getInstalledAppVersion(): string | null {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version.trim() !== '' ? version.trim() : null;
}

/**
 * The store page to send someone to when their build is too old.
 *
 * Android's comes from the package name. iOS needs the numeric App Store id,
 * which does not exist until the app is listed: set
 * `EXPO_PUBLIC_IOS_APP_STORE_ID` once it is. Until then this is null on iOS and
 * the update screen says where to go instead of offering a button that fails.
 */
export function getStoreUrl(): string | null {
  const platform = getAppPlatform();
  if (platform === 'android') {
    const pkg = Constants.expoConfig?.android?.package;
    return pkg ? `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}` : null;
  }
  if (platform === 'ios') {
    const id = process.env.EXPO_PUBLIC_IOS_APP_STORE_ID?.trim();
    return id ? `https://apps.apple.com/app/id${encodeURIComponent(id)}` : null;
  }
  return null;
}
