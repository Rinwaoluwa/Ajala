import { isApiError } from '@core/api/ApiError';

import type { ChatRepository } from '../../domain/repositories/ChatRepository';
import { createChatApi, type ChatRequest } from '../datasources/remote/chatApi';
import {
  toChatError,
  toMessage,
  toMessagesPage,
  toPost,
  toThreadDetail,
  toThreadsPage,
  type ChatCall,
} from '../mappers/chatMappers';

/**
 * `ChatRepository` over the chat API (spec §3.9).
 *
 * Nothing is cached here: chat is `realtime` in the caching table
 * (ARCHITECTURE §7), so the screens' queries hold the last answer and the
 * socket and refetch-on-focus keep it fresh. Picture links last an hour, which
 * is a second reason not to keep messages on disk.
 */
export function createChatRepository(request: ChatRequest): ChatRepository {
  const api = createChatApi(request);
  const guard =
    (call: ChatCall) =>
    async <T>(run: () => Promise<T>): Promise<T> => {
      try {
        return await run();
      } catch (e) {
        throw toChatError(e, call);
      }
    };
  const list = guard('list');
  const start = guard('start');
  const send = guard('send');
  const members = guard('members');
  const report = guard('report');
  const other = guard('other');

  return {
    listThreads: (filter, search, cursor, limit) =>
      list(async () => toThreadsPage(await api.list(filter, search, cursor, limit))),
    startThread: (target) => start(async () => toThreadDetail(await api.start(target))),
    getThread: (id) => other(async () => toThreadDetail(await api.detail(id))),
    getMessages: (id, before, limit) => other(async () => toMessagesPage(await api.messages(id, before, limit))),
    sendMessage: (id, draft) =>
      send(async () =>
        toMessage(
          await api.send(id, {
            clientMsgId: draft.clientMsgId,
            body: draft.body,
            taggedPostId: draft.taggedPostId,
            images: draft.images,
          }),
        ),
      ),
    markRead: (id, messageId) => other(() => api.read(id, { messageId })),
    sendTyping: (id) => other(() => api.typing(id)),
    addMember: (id, userId) => members(() => api.addMember(id, { userId })),
    removeMember: (id, userId) => members(() => api.removeMember(id, userId)),
    reportMessage: (id, messageId, reason, details) =>
      report(async () => {
        await api.report(id, messageId, details ? { reason, details } : { reason });
      }),
    getMyId: () => other(async () => (await api.me()).id),
    getPost: (postId) =>
      other(async () => {
        try {
          return toPost(await api.post(postId));
        } catch (e) {
          // A post that was deleted or is hidden from you: the chat simply has no card.
          if (isApiError(e) && (e.code === 'NOT_FOUND' || e.code === 'GONE')) return null;
          throw e;
        }
      }),
  };
}
