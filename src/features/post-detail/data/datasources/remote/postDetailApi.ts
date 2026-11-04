import type {
  AttendeesPageDto,
  CommentDto,
  CommentsPageDto,
  MeDto,
  PostDetailDto,
  RsvpStateResponseDto,
} from '../../dto/postDetailDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * The post page's endpoints as the signed-in person (API map §6, spec §2.12–2.13).
 * `request` is auth's `AuthorizedRequest`.
 */
export type PostDetailRequest = <T>(request: {
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  retry?: boolean;
}) => Promise<T>;

const query = (params: Record<string, string | number | null>) =>
  Object.entries(params)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');

const post = (id: string) => `${V1}/posts/${encodeURIComponent(id)}`;

export function createPostDetailApi(request: PostDetailRequest) {
  return {
    /** The location header fills `distanceKm`. */
    getPost: (id: string, headers: Record<string, string> | null) =>
      request<PostDetailDto>({ method: 'GET', path: post(id), headers: headers ?? undefined }),

    getAttendees: (id: string, state: string, cursor: string | null, limit: number) =>
      request<AttendeesPageDto>({
        method: 'GET',
        path: `${post(id)}/attendees?${query({ state, cursor, limit })}`,
      }),

    join: (id: string) => request<RsvpStateResponseDto>({ method: 'POST', path: `${post(id)}/rsvp` }),
    leave: (id: string) => request<void>({ method: 'DELETE', path: `${post(id)}/rsvp` }),
    linkClick: (id: string) => request<void>({ method: 'POST', path: `${post(id)}/link-click` }),

    respond: (id: string, userId: string, answer: 'accept' | 'decline') =>
      request<RsvpStateResponseDto>({
        method: 'POST',
        path: `${post(id)}/attendees/${encodeURIComponent(userId)}/${answer}`,
      }),

    cancel: (id: string) => request<unknown>({ method: 'POST', path: `${post(id)}/cancel` }),
    remove: (id: string) => request<void>({ method: 'DELETE', path: post(id) }),
    getMe: () => request<MeDto>({ method: 'GET', path: `${V1}/me` }),

    /** PROPOSED — not in the API yet (API map §12); the demo answers it. */
    getComments: (id: string, cursor: string | null, limit: number) =>
      request<CommentsPageDto>({
        method: 'GET',
        path: `${post(id)}/comments?${query({ cursor, limit })}`,
        retry: false,
      }),

    /** PROPOSED — not in the API yet (API map §12); the demo answers it. */
    addComment: (id: string, text: string, replyToId: string | null) =>
      request<CommentDto>({
        method: 'POST',
        path: `${post(id)}/comments`,
        body: { text, ...(replyToId ? { replyToId } : null) },
      }),
  };
}
