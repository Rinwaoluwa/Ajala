import type { ChatRepository } from '../../domain/repositories/ChatRepository';
import { createChatApi, type ChatRequest } from '../datasources/remote/chatApi';
import { toChatError, toMessage, toMessagesPage, toThread, toThreadsPage } from '../mappers/chatMappers';

/** `ChatRepository` over the (proposed) API. Nothing is cached here; the screens' queries do that. */
export function createChatRepository(request: ChatRequest): ChatRepository {
  const api = createChatApi(request);
  const guard = async <T>(call: () => Promise<T>): Promise<T> => {
    try {
      return await call();
    } catch (e) {
      throw toChatError(e);
    }
  };
  return {
    listThreads: (filter, q, cursor, limit) =>
      guard(async () => toThreadsPage(await api.listThreads(filter, q, cursor, limit))),
    getThread: (id) => guard(async () => toThread(await api.getThread(id))),
    getMessages: (id, cursor, limit) =>
      guard(async () => toMessagesPage(await api.getMessages(id, cursor, limit))),
    sendMessage: (id, text) => guard(async () => toMessage(await api.sendMessage(id, text))),
    markRead: (id) => guard(() => api.markRead(id)),
  };
}
