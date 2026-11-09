import type {
  ChatEvent,
  ChatFilter,
  ChatMessage,
  ChatThreadDetail,
  LocalImage,
  MessageDraft,
  MessagesPage,
  ReportReason,
  StartTarget,
  ThreadsPage,
} from '../entities/Chat';

/** The chat API (spec §3.9). Every method throws `ChatError`. */
export interface ChatRepository {
  listThreads(filter: ChatFilter, search: string, cursor: string | null, limit: number): Promise<ThreadsPage>;
  /**
   * A direct chat with someone: the existing one, or a new one. A post's group
   * chat is made by the API when the post goes live, so for `{ postId }` this
   * only finds the one you are already in.
   */
  startThread(target: StartTarget): Promise<ChatThreadDetail>;
  getThread(threadId: string): Promise<ChatThreadDetail>;
  /** Newest first; `before` is the oldest id already held. */
  getMessages(threadId: string, before: string | null, limit: number): Promise<MessagesPage>;
  sendMessage(threadId: string, draft: MessageDraft): Promise<ChatMessage>;
  /** Read up to `messageId`. The API never moves it back. */
  markRead(threadId: string, messageId: string): Promise<void>;
  sendTyping(threadId: string): Promise<void>;
  addMember(threadId: string, userId: string): Promise<void>;
  /** Your own id leaves; the host may remove others. */
  removeMember(threadId: string, userId: string): Promise<void>;
  reportMessage(threadId: string, messageId: string, reason: ReportReason, details: string | null): Promise<void>;
  /** How many conversations have something unread (not how many messages): the Messages badge. */
  getUnreadCount(): Promise<number>;
}

/**
 * The live connection (socket `/chat`), plus chat pushes that arrive while the
 * app is open. Best effort: a missed event costs nothing, because a thread is
 * fetched again whenever it is opened.
 */
/**
 * A current access token, or null when signed out. `refused` is one the server
 * just turned away: the answer must be a different (refreshed) token.
 */
export type LiveTokenSource = (refused?: string) => Promise<string | null>;

export interface ChatLive {
  /** Keeps the connection open until the returned function is called. */
  hold(getToken: LiveTokenSource): () => void;
  subscribe(listener: (event: ChatEvent) => void): () => void;
}

/** Picking photos to send, resized and compressed on the phone first. */
export type PhotoPicker = (limit: number) => Promise<LocalImage[]>;

/** Makes the uuid a send is known by. */
export type IdMaker = () => string;

/** Whether the "Keep chats on Ajala" banner was closed on this phone. */
export interface SafetyBannerStore {
  isDismissed(): Promise<boolean>;
  dismiss(): Promise<void>;
}
