import { ChatError } from '../entities/ChatError';
import type { ChatFilter } from '../entities/Chat';
import type { ChatRepository, SafetyBannerStore } from '../repositories/ChatRepository';
import { MESSAGE_MAX, MESSAGES_PAGE, THREADS_PAGE } from '../rules/chatRules';

export const makeListThreads =
  (repo: ChatRepository) =>
  (filter: ChatFilter, query: string, cursor: string | null = null) =>
    repo.listThreads(filter, query.trim(), cursor, THREADS_PAGE);

export const makeGetThread = (repo: ChatRepository) => (threadId: string) => repo.getThread(threadId);

export const makeGetMessages =
  (repo: ChatRepository) =>
  (threadId: string, cursor: string | null = null) =>
    repo.getMessages(threadId, cursor, MESSAGES_PAGE);

/** Trimmed, 1–2000 characters; anything else is refused before it is sent. */
export const makeSendMessage = (repo: ChatRepository) => async (threadId: string, text: string) => {
  const body = text.trim();
  if (!body || body.length > MESSAGE_MAX) throw new ChatError('invalid');
  return repo.sendMessage(threadId, body);
};

export const makeMarkRead = (repo: ChatRepository) => (threadId: string) => repo.markRead(threadId);

export const makeSafetyBanner = (store: SafetyBannerStore) => ({
  isDismissed: () => store.isDismissed(),
  dismiss: () => store.dismiss(),
});
