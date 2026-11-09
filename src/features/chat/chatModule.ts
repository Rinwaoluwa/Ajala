import * as Crypto from 'expo-crypto';

import { pickImages } from '@core/media/imagePicker';
import { chatSocket } from '@core/api/websocket/chatSocket';
import { onPushReceived } from '@core/push/pushNotifications';

import { safetyBannerStore } from './data/datasources/local/safetyBannerStore';
import { createChatLive } from './data/datasources/realtime/chatLive';
import type { ChatRequest } from './data/datasources/remote/chatApi';
import { createChatRepository } from './data/repositories/ChatRepositoryImpl';
import {
  makeAddMember,
  makeGetMessages,
  makeGetThread,
  makeGetUnreadCount,
  makeListThreads,
  makeLive,
  makeMarkRead,
  makePickPhotos,
  makePrepareMessage,
  makeRemoveMember,
  makeReportMessage,
  makeSafetyBanner,
  makeSendMessage,
  makeSendTyping,
  makeStartThread,
} from './domain/usecases/ChatUseCases';

/**
 * The feature's composition root. `request` makes calls as the signed-in person
 * (auth's `AuthorizedRequest`), handed in by the presentation layer.
 *
 * Pictures go through the app's one picker, which resizes them (long edge
 * 2048) and re-encodes them as JPEG, as every other upload does (spec §1.4).
 *
 * The live side hears the socket and, so that the list and the Messages badge
 * catch up even when the socket is down, chat pushes that arrive while the app
 * is open.
 */
export function createChatUseCases(request: ChatRequest) {
  const repo = createChatRepository(request);
  return {
    listThreads: makeListThreads(repo),
    startThread: makeStartThread(repo),
    getThread: makeGetThread(repo),
    getMessages: makeGetMessages(repo),
    prepareMessage: makePrepareMessage(() => Crypto.randomUUID()),
    sendMessage: makeSendMessage(repo),
    markRead: makeMarkRead(repo),
    sendTyping: makeSendTyping(repo),
    addMember: makeAddMember(repo),
    removeMember: makeRemoveMember(repo),
    reportMessage: makeReportMessage(repo),
    getUnreadCount: makeGetUnreadCount(repo),
    pickPhotos: makePickPhotos((limit) => pickImages({ limit })),
    live: makeLive(createChatLive(chatSocket, (listener) => onPushReceived((push) => listener(push.data)))),
    safetyBanner: makeSafetyBanner(safetyBannerStore),
  };
}

export type ChatUseCases = ReturnType<typeof createChatUseCases>;
