import { createNotificationsRepository } from './data/repositories/NotificationsRepositoryImpl';

/** The feature's composition root. */
export function createNotificationsUseCases() {
  const repo = createNotificationsRepository();
  return { list: () => repo.list() };
}

export type NotificationsUseCases = ReturnType<typeof createNotificationsUseCases>;
