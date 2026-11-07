import { describe, expect, it } from '@jest/globals';

import type { DeviceRegistration } from '../entities/PushDevice';
import type { PushDevicesRepository } from '../repositories/PushDevicesRepository';
import { makeRegisterPushDevice, makeUnregisterPushDevice } from '../usecases/PushUseCases';

function fakeDevices(options: { stored?: string | null; failing?: boolean } = {}) {
  let stored = options.stored ?? null;
  const calls = { register: [] as DeviceRegistration[], unregister: [] as string[] };
  const repo: PushDevicesRepository = {
    identity: async () => ({ deviceId: 'android-1', timezone: 'Europe/London' }),
    register: async (r) => {
      calls.register.push(r);
      if (options.failing) throw new Error('network down');
    },
    unregister: async (t) => {
      calls.unregister.push(t);
      if (options.failing) throw new Error('network down');
    },
    registeredToken: async () => stored,
    setRegisteredToken: async (t) => {
      stored = t;
    },
  };
  return {
    repo,
    calls,
    get stored() {
      return stored;
    },
  };
}

describe('registering this phone for pushes', () => {
  it('sends the token with the sign-in device id, then remembers it', async () => {
    const fake = fakeDevices();
    await expect(makeRegisterPushDevice(fake.repo)({ token: 'fcm-1', platform: 'android' })).resolves.toBe(true);
    expect(fake.calls.register).toEqual([
      { token: 'fcm-1', platform: 'android', deviceId: 'android-1', timezone: 'Europe/London' },
    ]);
    expect(fake.stored).toBe('fcm-1');
  });

  it('remembers nothing when the API call fails', async () => {
    const fake = fakeDevices({ failing: true });
    await expect(makeRegisterPushDevice(fake.repo)({ token: 'fcm-1', platform: 'android' })).rejects.toThrow();
    expect(fake.stored).toBeNull();
  });

  it('sends nothing for a token the API would refuse', async () => {
    const fake = fakeDevices();
    await expect(makeRegisterPushDevice(fake.repo)({ token: '', platform: 'ios' })).resolves.toBe(false);
    expect(fake.calls.register).toHaveLength(0);
  });
});

describe('unregistering at sign-out', () => {
  it('unregisters the remembered token and forgets it', async () => {
    const fake = fakeDevices({ stored: 'apns-1' });
    await makeUnregisterPushDevice(fake.repo)();
    expect(fake.calls.unregister).toEqual(['apns-1']);
    expect(fake.stored).toBeNull();
  });

  it('forgets the token even when the call fails, since the session is ending', async () => {
    const fake = fakeDevices({ stored: 'apns-1', failing: true });
    await expect(makeUnregisterPushDevice(fake.repo)()).rejects.toThrow();
    expect(fake.stored).toBeNull();
  });

  it('calls nothing when no token was registered', async () => {
    const fake = fakeDevices();
    await makeUnregisterPushDevice(fake.repo)();
    expect(fake.calls.unregister).toHaveLength(0);
  });
});
