import type { PasswordSaveOutcome, PasswordVault } from '../repositories/PasswordVault';
import { normalizeEmail } from '../rules/credentialRules';

/**
 * Offering to save the password to the person's password manager, once they are in.
 *
 *   - `signedUp`: always. The password is brand new; no manager has it yet.
 *   - `signedIn`: once per account on this device. Someone who typed it from
 *     memory gets the offer; someone who signs in every week is not asked every
 *     week. An answer of either kind counts — no is respected too.
 *
 * Saved under the email, normalised the way the API stores it, so the manager
 * fills the address sign-in will accept.
 */

export type PasswordSaveMoment = 'signedUp' | 'signedIn';

export const makeOfferPasswordSave =
  (vault: PasswordVault) =>
  async ({
    email,
    password,
    moment,
  }: {
    email: string;
    password: string;
    moment: PasswordSaveMoment;
  }): Promise<PasswordSaveOutcome | 'skipped'> => {
    const account = normalizeEmail(email);
    if (account === '' || password === '') return 'skipped';
    if (moment === 'signedIn' && (await vault.hasOffered(account))) return 'skipped';

    const outcome = await vault.offer(account, password);
    if (outcome === 'saved' || outcome === 'dismissed') await vault.markOffered(account);
    return outcome;
  };

/**
 * After a password reset: what any manager holds is now the OLD password, so the
 * next sign-in offers the new one, whoever it is for.
 */
export const makeForgetPasswordSaveOffers = (vault: PasswordVault) => () => vault.forgetOffers();

export type OfferPasswordSaveUseCase = ReturnType<typeof makeOfferPasswordSave>;
