import { isAuthError } from '../entities/AuthError';
import type { AuthRepository } from '../repositories/AuthRepository';
import { nextStepFor, type NextStep } from '../rules/accountRules';
import type { WithSession } from './SessionUseCases';

/**
 * What happens straight after signing in, by whatever route.
 *
 * `GET /me` decides it: an unfinished profile goes to setup, out-of-date terms go
 * to the terms screen, and everyone else goes into the app.
 */

/**
 * Where to send someone who has just signed in.
 *
 * If the account cannot be read (offline, say) this falls back rather than
 * stranding them: a new account to profile setup, since every new account starts
 * incomplete, and anyone else into the app. An expired session is not a fallback
 * case — it rejects, and the caller sends them back to sign in.
 */
export const makeResolveNextStep =
  (repo: AuthRepository, withSession: WithSession) =>
  async ({ isNew }: { isNew: boolean }): Promise<NextStep> => {
    try {
      return nextStepFor(await withSession((token) => repo.getAccount(token)));
    } catch (e) {
      if (isAuthError(e) && e.code === 'sessionExpired') throw e;
      return isNew ? 'completeProfile' : 'home';
    }
  };

/** The terms in force, to show before asking for acceptance. */
export const makeGetCurrentTerms = (repo: AuthRepository) => () => repo.getCurrentTerms();

/**
 * Accepts the terms in force (`POST /me/terms/accept { version }`), then says
 * where to go next.
 *
 * The version is read fresh rather than passed in, so a screen left open across
 * a terms change cannot accept the old ones. If the API still answers that the
 * version is not current — the remembered app config predates a change — the
 * config is fetched again and the acceptance retried once.
 *
 * The next step is worked out from `GET /me` as usual, except that the terms are
 * taken as accepted: the API just said 204, and a stale read must not send the
 * person straight back to the screen they have just left. Without the account
 * (offline, say) it falls back to home, as `resolveNextStep` would.
 */
export const makeAcceptTerms =
  (repo: AuthRepository, withSession: WithSession) =>
  async (): Promise<NextStep> => {
    const { version } = await repo.getCurrentTerms();
    try {
      await withSession((token) => repo.acceptTerms(token, version));
    } catch (e) {
      if (!isAuthError(e) || e.code !== 'termsOutdated') throw e;
      const current = await repo.getCurrentTerms({ fresh: true });
      await withSession((token) => repo.acceptTerms(token, current.version));
    }

    try {
      const account = await withSession((token) => repo.getAccount(token));
      return nextStepFor({ ...account, termsUpToDate: true });
    } catch (e) {
      if (isAuthError(e) && e.code === 'sessionExpired') throw e;
      return 'home';
    }
  };

export type ResolveNextStepUseCase = ReturnType<typeof makeResolveNextStep>;
export type AcceptTermsUseCase = ReturnType<typeof makeAcceptTerms>;
