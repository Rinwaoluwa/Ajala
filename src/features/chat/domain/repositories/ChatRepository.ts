import type {
  ChatEvent,
  ChatFilter,
  ChatMessage,
  ChatPost,
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
  /** The existing conversation, or a new one. */
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
  /** The signed-in person's id, to tell their messages apart in the list. */
  getMyId(): Promise<string>;
  /** The activity card at the top of a chat; null when the post can't be seen. */
  getPost(postId: string): Promise<ChatPost | null>;
}

/**
 * The live connection (socket `/chat`). Best effort: a missed event costs
 * nothing, because a thread is fetched again whenever it is opened.
 */
export interface ChatLive {
  /** Keeps the connection open until the returned function is called. */
  hold(getToken: () => Promise<string | null>): () => void;
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
