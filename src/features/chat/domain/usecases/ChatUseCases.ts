import { ChatError } from '../entities/ChatError';
import type { ChatFilter, LocalImage, MessageDraft, ReportReason, StartTarget } from '../entities/Chat';
import type {
  ChatLive,
  ChatRepository,
  IdMaker,
  LiveTokenSource,
  PhotoPicker,
  SafetyBannerStore,
} from '../repositories/ChatRepository';
import {
  IMAGES_MAX,
  MESSAGES_PAGE,
  REPORT_DETAILS_MAX,
  SEARCH_MAX,
  THREADS_PAGE,
  draftProblem,
} from '../rules/chatRules';

/** The search is trimmed and cut to the API's 60 characters rather than refused. */
export const makeListThreads =
  (repo: ChatRepository) =>
  (filter: ChatFilter, search: string, cursor: string | null = null) =>
    repo.listThreads(filter, search.trim().slice(0, SEARCH_MAX), cursor, THREADS_PAGE);

/**
 * Exactly one of a person or a post; anything else never reaches the API. A
 * post's group chat is never made here: the API makes it when the post goes
 * live, so `{ postId }` finds the one you are in.
 */
export const makeStartThread = (repo: ChatRepository) => (target: Partial<{ userId: string; postId: string }>) => {
  const userId = target.userId?.trim();
  const postId = target.postId?.trim();
  if (!!userId === !!postId) return Promise.reject(new ChatError('invalid'));
  const exact: StartTarget = userId ? { userId } : { postId: postId as string };
  return repo.startThread(exact);
};

export const makeGetThread = (repo: ChatRepository) => (threadId: string) => repo.getThread(threadId);

export const makeGetMessages =
  (repo: ChatRepository) =>
  (threadId: string, before: string | null = null) =>
    repo.getMessages(threadId, before, MESSAGES_PAGE);

/**
 * A message ready to send, with the uuid it will be known by. Made once: a
 * retry sends this same draft, so the API answers with the first copy instead
 * of posting it twice.
 */
export const makePrepareMessage =
  (newId: IdMaker) =>
  (body: string, images: LocalImage[] = [], taggedPostId: string | null = null): MessageDraft => ({
    clientMsgId: newId(),
    body: body.trim(),
    images,
    taggedPostId,
  });

/** Words up to 2,000 characters and/or up to 4 pictures; anything else is refused before it goes. */
export const makeSendMessage = (repo: ChatRepository) => (threadId: string, draft: MessageDraft) => {
  if (draftProblem(draft.body, draft.images.length)) return Promise.reject(new ChatError('invalid'));
  return repo.sendMessage(threadId, { ...draft, body: draft.body.trim() });
};

export const makeMarkRead = (repo: ChatRepository) => (threadId: string, messageId: string) =>
  repo.markRead(threadId, messageId);

export const makeSendTyping = (repo: ChatRepository) => (threadId: string) => repo.sendTyping(threadId);

export const makeAddMember = (repo: ChatRepository) => (threadId: string, userId: string) =>
  repo.addMember(threadId, userId);

export const makeRemoveMember = (repo: ChatRepository) => (threadId: string, userId: string) =>
  repo.removeMember(threadId, userId);

/** "Something else" needs a few words; the note is at most 500 characters. */
export const makeReportMessage =
  (repo: ChatRepository) => (threadId: string, messageId: string, reason: ReportReason, details: string) => {
    const note = details.trim();
    if ((reason === 'other' && !note) || note.length > REPORT_DETAILS_MAX) {
      return Promise.reject(new ChatError('invalid'));
    }
    return repo.reportMessage(threadId, messageId, reason, note || null);
  };

export const canSubmitReport = (reason: ReportReason | null, details: string) =>
  !!reason && (reason !== 'other' || details.trim().length > 0) && details.trim().length <= REPORT_DETAILS_MAX;

export const makeGetUnreadCount = (repo: ChatRepository) => () => repo.getUnreadCount();

/** Pictures for one message: only as many as are still free of the four. */
export const makePickPhotos = (pick: PhotoPicker) => (alreadyAttached: number) =>
  pick(Math.max(0, IMAGES_MAX - alreadyAttached));

export const makeLive = (live: ChatLive) => ({
  hold: (getToken: LiveTokenSource) => live.hold(getToken),
  subscribe: (listener: Parameters<ChatLive['subscribe']>[0]) => live.subscribe(listener),
});

export const makeSafetyBanner = (store: SafetyBannerStore) => ({
  isDismissed: () => store.isDismissed(),
  dismiss: () => store.dismiss(),
});
