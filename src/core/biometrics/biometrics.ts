import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

/**
 * The phone's biometric unlock — Face ID or Touch ID, fingerprint or face unlock
 * on Android. The only file that imports `expo-local-authentication`.
 *
 * `kind` names what the person will actually use, so screens can say "Face ID"
 * on an iPhone with Face ID and "fingerprint" on an Android phone with one.
 * Unavailable means no hardware, or nothing enrolled: there is nothing to offer.
 */

export type BiometricKind = 'faceId' | 'touchId' | 'face' | 'fingerprint' | 'biometric';

export type BiometricAvailability = { available: true; kind: BiometricKind } | { available: false };

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  try {
    const [hardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    if (!hardware || !enrolled) return { available: false };
    return { available: true, kind: kindFor(types) };
  } catch {
    return { available: false };
  }
}

function kindFor(types: LocalAuthentication.AuthenticationType[]): BiometricKind {
  const face = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
  const finger = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
  if (Platform.OS === 'ios') return face ? 'faceId' : 'touchId';
  // An Android phone that offers both is described by the one most people use.
  if (finger) return 'fingerprint';
  return face ? 'face' : 'biometric';
}

export type BiometricResult = 'success' | 'cancelled' | 'failed';

/**
 * Shows the system biometric prompt. `cancelled` is the person backing out (or
 * the system interrupting); `failed` is everything else, including a lockout
 * after too many tries.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      // The fallback is the app's own password sign-in, not the device passcode.
      disableDeviceFallback: true,
      fallbackLabel: '',
    });
    if (result.success) return 'success';
    return ['user_cancel', 'app_cancel', 'system_cancel', 'user_fallback'].includes(result.error)
      ? 'cancelled'
      : 'failed';
  } catch {
    return 'failed';
  }
}
