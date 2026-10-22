// SIGN IN WITH APPLE — DISABLED until there is a paid Apple Developer account
// (the capability cannot be signed by a free team; see app.config.js). While it
// is off, Apple reports itself unavailable, so the button is hidden on both
// options screens. The package is uninstalled too, because it adds the
// capability by itself. To turn it back on: `npx expo install
// expo-apple-authentication`, uncomment the import and the two bodies below,
// delete the two stand-in lines, and follow the note in app.config.js.

// import * as AppleAuthentication from 'expo-apple-authentication';

import { AuthError } from '../../../domain/entities/AuthError';
import type { Nonce } from './nonce';

/**
 * Sign in with Apple, the native sheet (iOS only).
 *
 * Returns what `POST /auth/oauth/apple` needs. Apple gives the person's name on
 * the FIRST authorisation only and never again, so it is passed through whenever
 * it is present — drop it once and the account has no name.
 */

export type AppleIdentity = {
  identityToken: string;
  authorizationCode: string;
  firstName?: string;
  lastName?: string;
};

/** False on Android and on iOS builds without the capability. */
export async function isAppleSignInAvailable(): Promise<boolean> {
  return false; // stand-in while disabled

  // try {
  //   return await AppleAuthentication.isAvailableAsync();
  // } catch {
  //   return false;
  // }
}

export async function requestAppleIdentity(nonce: Nonce): Promise<AppleIdentity> {
  throw new AuthError('providerUnavailable'); // stand-in while disabled

  // if (!(await isAppleSignInAvailable())) throw new AuthError('providerUnavailable');
  //
  // let credential: AppleAuthentication.AppleAuthenticationCredential;
  // try {
  //   credential = await AppleAuthentication.signInAsync({
  //     requestedScopes: [
  //       AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
  //       AppleAuthentication.AppleAuthenticationScope.EMAIL,
  //     ],
  //     // Apple is given the hash; the API gets the raw value and compares.
  //     nonce: nonce.sha256,
  //   });
  // } catch (e) {
  //   const code = (e as { code?: string } | null)?.code;
  //   if (code === 'ERR_REQUEST_CANCELED') throw new AuthError('cancelled');
  //   throw new AuthError('unknown', e instanceof Error ? e.message : undefined);
  // }
  //
  // if (!credential.identityToken || !credential.authorizationCode) {
  //   throw new AuthError('unknown', 'Apple returned no identity token.');
  // }
  //
  // const firstName = credential.fullName?.givenName?.trim();
  // const lastName = credential.fullName?.familyName?.trim();
  // return {
  //   identityToken: credential.identityToken,
  //   authorizationCode: credential.authorizationCode,
  //   ...(firstName ? { firstName } : null),
  //   ...(lastName ? { lastName } : null),
  // };
}
