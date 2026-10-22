import { authenticateWithBiometrics, getBiometricAvailability } from '@core/biometrics/biometrics';

import { appLockPreference } from './data/appLockPreference';

/**
 * The feature's composition root: the stored preference and the phone's
 * biometric prompt, for the presentation layer.
 */
export const appLock = {
  preference: appLockPreference,
  availability: getBiometricAvailability,
  authenticate: authenticateWithBiometrics,
};
