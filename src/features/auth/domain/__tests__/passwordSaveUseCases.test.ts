import { describe, expect, it } from '@jest/globals';

import type { PasswordSaveOutcome, PasswordVault } from '../repositories/PasswordVault';
import { makeForgetPasswordSaveOffers, makeOfferPasswordSave } from '../usecases/PasswordSaveUseCases';

function createFakeVault(answer: PasswordSaveOutcome = 'saved') {
  const offered = new Set<string>();
  const offers: { account: string; password: string }[] = [];
  const vault: PasswordVault = {
    offer: async (account, password) => {
      offers.push({ account, password });
      return answer;
    },
    hasOffered: async (account) => offered.has(account),
    markOffered: async (account) => {
      offered.add(account);
    },
    forgetOffers: async () => offered.clear(),
  };
  return { vault, offers, offered };
}

describe('offering to save the password', () => {
  it('saves under the normalised email', async () => {
    const { vault, offers } = createFakeVault();
    await makeOfferPasswordSave(vault)({ email: ' Sarah@Gmail.com ', password: 'Travel2026', moment: 'signedUp' });

    expect(offers).toEqual([{ account: 'sarah@gmail.com', password: 'Travel2026' }]);
  });

  it('offers after every sign-up, even for an account offered before', async () => {
    const { vault, offers } = createFakeVault();
    const offer = makeOfferPasswordSave(vault);
    await offer({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedUp' });
    await offer({ email: 'sarah@gmail.com', password: 'Travel2027', moment: 'signedUp' });

    expect(offers).toHaveLength(2);
  });

  it('offers on sign-in only once per account', async () => {
    const { vault, offers } = createFakeVault();
    const offer = makeOfferPasswordSave(vault);
    await offer({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedIn' });
    const second = await offer({ email: 'SARAH@gmail.com', password: 'Travel2026', moment: 'signedIn' });

    expect(offers).toHaveLength(1);
    expect(second).toBe('skipped');
  });

  it('respects a no: a dismissed offer is not repeated on sign-in', async () => {
    const { vault, offers } = createFakeVault('dismissed');
    const offer = makeOfferPasswordSave(vault);
    await offer({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedIn' });
    await offer({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedIn' });

    expect(offers).toHaveLength(1);
  });

  it('keeps offering where nothing could be shown', async () => {
    const { vault, offered } = createFakeVault('unavailable');
    await makeOfferPasswordSave(vault)({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedIn' });

    expect(offered.size).toBe(0);
  });

  it('offers again on sign-in after a password reset', async () => {
    const { vault, offers } = createFakeVault();
    const offer = makeOfferPasswordSave(vault);
    await offer({ email: 'sarah@gmail.com', password: 'Travel2026', moment: 'signedIn' });
    await makeForgetPasswordSaveOffers(vault)();
    await offer({ email: 'sarah@gmail.com', password: 'Travel2027', moment: 'signedIn' });

    expect(offers).toHaveLength(2);
  });

  it('skips with nothing to save', async () => {
    const { vault, offers } = createFakeVault();
    const result = await makeOfferPasswordSave(vault)({ email: 'sarah@gmail.com', password: '', moment: 'signedUp' });

    expect(result).toBe('skipped');
    expect(offers).toHaveLength(0);
  });
});
