import type { DevicePushToken } from '../entities/PushDevice';
import type { PushDevicesRepository } from '../repositories/PushDevicesRepository';
import { buildDeviceRegistration } from '../rules/pushRules';

/**
 * Tells the API this phone can get the signed-in person's pushes. Run after
 * sign-in and whenever the OS hands out a new token. Resolves false when the
 * token can't be sent (see `buildDeviceRegistration`); throws
 * `NotificationsError` when the API call fails.
 */
export const makeRegisterPushDevice =
  (repo: PushDevicesRepository) =>
  async (push: DevicePushToken): Promise<boolean> => {
    const registration = buildDeviceRegistration(push, await repo.identity());
    if (!registration) return false;
    await repo.register(registration);
    // Remembered only once the API has it, so sign-out never unregisters a token it never knew.
    await repo.setRegisteredToken(registration.token);
    return true;
  };

/**
 * Takes this phone off the person's pushes, just before sign-out (it needs the
 * session). The token is forgotten even when the call fails: the session is
 * about to end, so there would be no way to retry it, and the next sign-in
 * registers the token afresh for whoever signs in.
 */
export const makeUnregisterPushDevice = (repo: PushDevicesRepository) => async (): Promise<void> => {
  const token = await repo.registeredToken();
  if (!token) return;
  try {
    await repo.unregister(token);
  } finally {
    await repo.setRegisteredToken(null);
  }
};

export type RegisterPushDeviceUseCase = ReturnType<typeof makeRegisterPushDevice>;
export type UnregisterPushDeviceUseCase = ReturnType<typeof makeUnregisterPushDevice>;
