import { offerToSavePassword } from '@core/credentials/passwordManager';
import { secureStore } from '@core/storage/secure/secureStore';

import type { PasswordVault } from '../../../domain/repositories/PasswordVault';

/**
 * `PasswordVault` over the platform's password manager (`@core/credentials`) and
 * a list, in secure storage, of the accounts this device has offered to save.
 *
 * The list holds email addresses, so it lives in the keychain rather than plain
 * storage. It is capped: it only has to remember the few accounts used here.
 */

const OFFERED_KEY = 'auth.password_save_offered';
const MAX_REMEMBERED = 20;

async function readOffered(): Promise<string[]> {
  const raw = await secureStore.get(OFFERED_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((a): a is string => typeof a === 'string') : [];
  } catch {
    return [];
  }
}

export const passwordVault: PasswordVault = {
  offer: offerToSavePassword,

  async hasOffered(account) {
    return (await readOffered()).includes(account);
  },

  async markOffered(account) {
    const rest = (await readOffered()).filter((a) => a !== account);
    await secureStore.set(OFFERED_KEY, JSON.stringify([account, ...rest].slice(0, MAX_REMEMBERED)));
  },

  forgetOffers: () => secureStore.remove(OFFERED_KEY),
};
