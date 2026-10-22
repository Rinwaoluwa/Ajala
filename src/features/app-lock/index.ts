/**
 * Public API of the `app-lock` feature: biometric unlock (Face ID, Touch ID,
 * fingerprint, face unlock) for a signed-in app.
 */

export { AppLockGate, useAppLockSetup } from './presentation/components/AppLockGate';
export { useBiometricAvailability } from './presentation/hooks/useBiometricAvailability';
export { biometricCopy, type BiometricCopy } from './presentation/biometricCopy';
export type { BiometricKind, BiometricAvailability } from '@core/biometrics/biometrics';
