import { safetyBannerStore } from './data/datasources/local/safetyBannerStore';
import type { ChatRequest } from './data/datasources/remote/chatApi';
import { createChatRepository } from './data/repositories/ChatRepositoryImpl';
import {
  makeGetMessages,
  makeGetThread,
  makeListThreads,
  makeMarkRead,
  makeSafetyBanner,
  makeSendMessage,
} from './domain/usecases/ChatUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 */
export function createChatUseCases(request: ChatRequest) {
  const repo = createChatRepository(request);
  return {
    listThreads: makeListThreads(repo),
    getThread: makeGetThread(repo),
    getMessages: makeGetMessages(repo),
    sendMessage: makeSendMessage(repo),
    markRead: makeMarkRead(repo),
    safetyBanner: makeSafetyBanner(safetyBannerStore),
  };
}

export type ChatUseCases = ReturnType<typeof createChatUseCases>;
