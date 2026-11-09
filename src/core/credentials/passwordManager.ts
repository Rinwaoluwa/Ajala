import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

/**
 * Offering to save a password to the person's password manager.
 *
 * Android: an explicit prompt through Credential Manager (Google Password Manager,
 * or whichever provider they use), from the local `modules/password-manager`.
 *
 * iOS has no such call. iCloud Keychain offers to save by itself after a sign-in,
 * when the fields carry `username` / `password` / `new-password` content types (the
 * auth forms set them) AND the app has a `webcredentials:` associated domain — see
 * the links host (`EXPO_PUBLIC_LINKS_HOST`) in app.config.js. So here iOS answers "system".
 *
 * Never throws: a password manager that is missing or says no is not an error the
 * person needs to see. A build made before the module existed answers
 * "unavailable" rather than crashing.
 */

export type PasswordSaveOutcome =
  /** Saved, or updated, in the manager. */
  | 'saved'
  /** The prompt was shown and the person said no. */
  | 'dismissed'
  /** The operating system handles it (iOS). */
  | 'system'
  /** No manager, no prompt — nothing happened. */
  | 'unavailable';

type PasswordManagerModule = {
  savePassword(username: string, password: string): Promise<'saved' | 'dismissed' | 'unavailable'>;
};

const native =
  Platform.OS === 'android' ? requireOptionalNativeModule<PasswordManagerModule>('PasswordManager') : null;

export async function offerToSavePassword(username: string, password: string): Promise<PasswordSaveOutcome> {
  if (Platform.OS === 'ios') return 'system';
  if (!native || username === '' || password === '') return 'unavailable';
  try {
    return await native.savePassword(username, password);
  } catch {
    return 'unavailable';
  }
}
