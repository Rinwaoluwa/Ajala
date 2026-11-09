import type { ApiRequest } from '@core/api/apiClient';
import { appendFile } from '@core/api/uploadPart';

import type {
  AddMemberDto,
  ConversationDetailDto,
  ConversationsPageDto,
  MessageDto,
  MessagesPageDto,
  ReadUpToDto,
  ReportFiledDto,
  ReportMessageDto,
  StartConversationDto,
  UnreadCountDto,
} from '../../dto/chatDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/** Calls made as the signed-in person: auth's `AuthorizedRequest`, handed in by the presentation layer. */
export type ChatRequest = <T>(request: Omit<ApiRequest, 'accessToken'>) => Promise<T>;

/** A picture as React Native's `FormData` carries a file. */
export type UploadFile = { uri: string; name: string; type: string };

export type SendMessageInput = {
  clientMsgId: string;
  body: string;
  taggedPostId: string | null;
  images: UploadFile[];
};

const query = (params: Record<string, string | number | null>) => {
  const q = Object.entries(params)
    .filter(([, v]) => v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return q ? `?${q}` : '';
};

const conversation = (id: string) => `${V1}/conversations/${encodeURIComponent(id)}`;

/** The chat endpoints (spec §3.9). */
export function createChatApi(request: ChatRequest) {
  return {
    list: (tab: string, search: string, cursor: string | null, limit: number) =>
      request<ConversationsPageDto>({
        method: 'GET',
        path: `${V1}/conversations${query({ tab, search, cursor, limit })}`,
      }),
    /** The Messages badge. A literal path, so it is never read as a conversation id. */
    unreadCount: () => request<UnreadCountDto>({ method: 'GET', path: `${V1}/conversations/unread-count` }),
    start: (body: StartConversationDto) =>
      request<ConversationDetailDto>({ method: 'POST', path: `${V1}/conversations`, body }),
    detail: (id: string) => request<ConversationDetailDto>({ method: 'GET', path: conversation(id) }),
    messages: (id: string, before: string | null, limit: number) =>
      request<MessagesPageDto>({
        method: 'GET',
        path: `${conversation(id)}/messages${query({ before, limit })}`,
      }),
    /**
     * Multipart, as the spec requires for messages. Pictures go as repeated
     * `images` parts in order. The Content-Type is left to fetch, which adds
     * the boundary.
     */
    send: (id: string, input: SendMessageInput) => {
      const form = new FormData();
      form.append('clientMsgId', input.clientMsgId);
      if (input.body) form.append('body', input.body);
      if (input.taggedPostId) form.append('taggedPostId', input.taggedPostId);
      for (const image of input.images) {
        // React Native's FormData takes `{ uri, name, type }` for a file.
        appendFile(form, 'images', image);
      }
      return request<MessageDto>({ method: 'POST', path: `${conversation(id)}/messages`, body: form });
    },
    read: (id: string, body: ReadUpToDto) =>
      request<void>({ method: 'POST', path: `${conversation(id)}/read`, body }),
    typing: (id: string) => request<void>({ method: 'POST', path: `${conversation(id)}/typing` }),
    addMember: (id: string, body: AddMemberDto) =>
      request<void>({ method: 'POST', path: `${conversation(id)}/members`, body }),
    removeMember: (id: string, userId: string) =>
      request<void>({
        method: 'DELETE',
        path: `${conversation(id)}/members/${encodeURIComponent(userId)}`,
      }),
    report: (id: string, messageId: string, body: ReportMessageDto) =>
      request<ReportFiledDto>({
        method: 'POST',
        path: `${conversation(id)}/messages/${encodeURIComponent(messageId)}/report`,
        body,
      }),
  };
}

export type ChatApi = ReturnType<typeof createChatApi>;
