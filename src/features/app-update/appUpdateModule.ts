import { createAppUpdateRepository } from './data/repositories/AppUpdateRepositoryImpl';
import { makeCheckForRequiredUpdate } from './domain/usecases/CheckForRequiredUpdateUseCase';

/**
 * The feature's composition root: the one place that knows which repository
 * backs the use case.
 */
export function createAppUpdateUseCases() {
  const repo = createAppUpdateRepository();
  return { checkForRequiredUpdate: makeCheckForRequiredUpdate(repo) };
}

export type AppUpdateUseCases = ReturnType<typeof createAppUpdateUseCases>;
