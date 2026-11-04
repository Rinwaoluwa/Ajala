import type { ChatFilter, ChatMessage, ChatThread, MessagesPage, ThreadsPage } from '../entities/Chat';

/** What Messages needs (PROPOSED endpoints — see the README). Every method throws `ChatError`. */
export interface ChatRepository {
  listThreads(filter: ChatFilter, query: string, cursor: string | null, limit: number): Promise<ThreadsPage>;
  getThread(threadId: string): Promise<ChatThread>;
  getMessages(threadId: string, cursor: string | null, limit: number): Promise<MessagesPage>;
  sendMessage(threadId: string, text: string): Promise<ChatMessage>;
  markRead(threadId: string): Promise<void>;
}

/** Whether the "Keep chats on Ajala" banner was closed on this phone. */
export interface SafetyBannerStore {
  isDismissed(): Promise<boolean>;
  dismiss(): Promise<void>;
}
