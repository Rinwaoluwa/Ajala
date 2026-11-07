import type { DeviceIdentity, DeviceRegistration } from '../entities/PushDevice';

/**
 * This phone's push registration with the API (spec §2.10, API map §11), and
 * the token it last registered, kept so sign-out can take it back off.
 * The API methods throw `NotificationsError`; the local ones never throw.
 */
export interface PushDevicesRepository {
  /** The device id sign-in sent, and the phone's time zone. */
  identity(): Promise<DeviceIdentity>;
  /** `POST /me/devices`: idempotent, so re-sending the same token is fine. */
  register(registration: DeviceRegistration): Promise<void>;
  /** `POST /me/devices/unregister { token }`. */
  unregister(token: string): Promise<void>;
  /** The token last registered from this install, or null. */
  registeredToken(): Promise<string | null>;
  /** Remembers (or, with null, forgets) the registered token. */
  setRegisteredToken(token: string | null): Promise<void>;
}
