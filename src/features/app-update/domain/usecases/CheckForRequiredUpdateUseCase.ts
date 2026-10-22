import type { UpdateCheck } from '../entities/UpdateCheck';
import type { AppUpdateRepository } from '../repositories/AppUpdateRepository';
import { isUpdateRequired } from '../rules/versionRules';

/**
 * Asks whether this build is older than the API's `minAppVersion` (spec §2.1).
 *
 * Never rejects. When the config cannot be fetched — offline at launch, say —
 * the answer is "not required": locking someone out of the app because their
 * phone has no signal would be worse than letting an old build run until the
 * next check. The check runs again when the app returns to the foreground.
 */
export const makeCheckForRequiredUpdate =
  (repo: AppUpdateRepository) =>
  async (): Promise<UpdateCheck> => {
    const installedVersion = repo.getInstalledVersion();
    if (!installedVersion) return { required: false };

    let minimumVersion: string | null;
    try {
      minimumVersion = await repo.getMinimumVersion();
    } catch {
      return { required: false };
    }
    if (!minimumVersion || !isUpdateRequired(installedVersion, minimumVersion)) {
      return { required: false };
    }

    return { required: true, installedVersion, minimumVersion, storeUrl: repo.getStoreUrl() };
  };

export type CheckForRequiredUpdateUseCase = ReturnType<typeof makeCheckForRequiredUpdate>;
