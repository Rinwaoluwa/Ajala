import type { ChatFilter } from '../../domain/entities/Chat';

/** Messages' TanStack Query keys, under `chat` so they never meet another feature's. */
export const chatKeys = {
  threadLists: ['chat', 'threads'] as const,
  threads: (filter: ChatFilter, search: string) => ['chat', 'threads', filter, search] as const,
  threadDetails: ['chat', 'thread'] as const,
  thread: (id: string) => ['chat', 'thread', id] as const,
  messageLists: ['chat', 'messages'] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
  /** Who is typing in a conversation: user id → when to stop showing it (ms). Socket-fed only. */
  typing: (id: string) => ['chat', 'typing', id] as const,
  post: (id: string) => ['chat', 'post', id] as const,
  me: ['chat', 'me'] as const,
  safetyBanner: ['chat', 'safetyBanner'] as const,
};

export type TypingState = Record<string, number>;
