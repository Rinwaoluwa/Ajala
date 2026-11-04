import type { ChatThreadDto, MessageDto, MessagesPageDto, ThreadsPageDto } from '../../dto/chatDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * Messages' calls as the signed-in person. `request` is auth's `AuthorizedRequest`.
 *
 * Every path here is PROPOSED — chat is not in the API yet. In demo mode the
 * demo API answers them (`src/core/demo/routes/chat.ts`); against the real API
 * they answer 404 until the backend builds them, which the app reads as "not
 * available yet".
 */
export type ChatRequest = <T>(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  retry?: boolean;
}) => Promise<T>;

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const chat = (id: string) => `${V1}/chats/${encodeURIComponent(id)}`;

export function createChatApi(request: ChatRequest) {
  return {
    listThreads: (filter: string, q: string, cursor: string | null, limit: number) =>
      request<ThreadsPageDto>({
        method: 'GET',
        path: `${V1}/chats?${query({ filter, q, cursor, limit })}`,
        retry: false,
      }),
    getThread: (id: string) => request<ChatThreadDto>({ method: 'GET', path: chat(id), retry: false }),
    getMessages: (id: string, cursor: string | null, limit: number) =>
      request<MessagesPageDto>({
        method: 'GET',
        path: `${chat(id)}/messages?${query({ cursor, limit })}`,
        retry: false,
      }),
    sendMessage: (id: string, text: string) =>
      request<MessageDto>({ method: 'POST', path: `${chat(id)}/messages`, body: { text } }),
    markRead: (id: string) => request<void>({ method: 'POST', path: `${chat(id)}/read` }),
  };
}
