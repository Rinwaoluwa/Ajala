import type { Account } from '../entities/Account';

/**
 * Where someone goes once they are signed in, from the answer to `GET /me`.
 *
 * Terms that changed since they were accepted come first, then an unfinished
 * profile (every new account, since gender is never asked at sign-up), then the
 * app. That is the order of the client spec's bootstrap (§2.1 step 4). The
 * screen-to-API map lists the two the other way round, but there the order is
 * only the order of a table's sentences; putting the terms first is the one that
 * cannot let anyone carry on — even into profile setup — under terms they have
 * not accepted. A new account has just accepted them at sign-up, so for it the
 * two orders agree.
 */
export type NextStep = 'completeProfile' | 'acceptTerms' | 'home';

export function nextStepFor(account: Account): NextStep {
  if (!account.termsUpToDate) return 'acceptTerms';
  if (account.profileCompletedAt === null) return 'completeProfile';
  return 'home';
}
