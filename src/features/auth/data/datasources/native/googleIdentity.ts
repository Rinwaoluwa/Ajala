import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { AuthError } from '../../../domain/entities/AuthError';

/**
 * Google Sign-In, the native account picker.
 *
 * Returns the ID token `POST /auth/oauth/google` verifies. The API checks the
 * token was issued to OUR app, so the client ids below must be the ones
 * registered for the API in Google Cloud — the backend team owns them:
 *
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID   the "Web application" client; it is the
 *                                      token's audience on both platforms
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID   the "iOS" client
 *   GOOGLE_IOS_URL_SCHEME              its reversed form, read by app.config.js
 *                                      at build time, not by this file
 *
 * Without them the button reports "not available" instead of failing in the SDK.
 *
 * FLAGGED: the API wants the nonce written INTO the Google token. This SDK (the
 * free "Original" Google Sign-In) cannot pass one to Google, so the token carries
 * none. If the API enforces that check, Google sign-in is refused until either
 * the backend accepts a nonce-less Google token or the app moves to a module
 * that supports nonces (the paid Universal Sign-In). Only this file changes then.
 */

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let configured = false;

export function isGoogleSignInConfigured(): boolean {
  return Boolean(webClientId);
}

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId,
    ...(iosClientId ? { iosClientId } : null),
    // Only the ID token is needed; no Google API is called on the person's behalf.
    scopes: [],
    offlineAccess: false,
  });
  configured = true;
}

export async function requestGoogleIdToken(): Promise<string> {
  if (!isGoogleSignInConfigured()) throw new AuthError('providerUnavailable');
  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) throw new AuthError('cancelled');
    const idToken = response.data.idToken;
    if (!idToken) throw new AuthError('unknown', 'Google returned no ID token.');
    return idToken;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) throw new AuthError('cancelled');
      // A second tap while the picker is already up.
      if (e.code === statusCodes.IN_PROGRESS) throw new AuthError('cancelled');
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new AuthError('providerUnavailable');
      }
    }
    throw new AuthError('unknown', e instanceof Error ? e.message : undefined);
  }
}

/**
 * Forgets the Google account chosen last time, so the next sign-in shows the
 * picker again rather than silently reusing it. Best effort.
 */
export async function forgetGoogleAccount(): Promise<void> {
  if (!configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to undo.
  }
}
