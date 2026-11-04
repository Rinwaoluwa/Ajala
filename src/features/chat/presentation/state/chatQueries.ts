import type { ChatFilter } from '../../domain/entities/Chat';

/** Messages' TanStack Query keys, under `chat` so they never meet another feature's. */
export const chatKeys = {
  threadLists: ['chat', 'threads'] as const,
  threads: (filter: ChatFilter, q: string) => ['chat', 'threads', filter, q] as const,
  thread: (id: string) => ['chat', 'thread', id] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  safetyBanner: ['chat', 'safetyBanner'] as const,
};
