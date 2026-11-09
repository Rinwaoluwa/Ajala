import type {
  AttendeesPageDto,
  CommentDto,
  CommentsPageDto,
  CreateCommentDto,
  MeDto,
  PostDetailDto,
  ReportCommentDto,
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
const comment = (id: string, commentId: string) => `${post(id)}/comments/${encodeURIComponent(commentId)}`;

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

    /** `remove` takes someone going, or waiting, off the post for good (they are told). */
    respond: (id: string, userId: string, answer: 'accept' | 'decline' | 'remove') =>
      request<RsvpStateResponseDto>({
        method: 'POST',
        path: `${post(id)}/attendees/${encodeURIComponent(userId)}/${answer}`,
      }),

    cancel: (id: string) => request<unknown>({ method: 'POST', path: `${post(id)}/cancel` }),
    remove: (id: string) => request<void>({ method: 'DELETE', path: post(id) }),
    getMe: () => request<MeDto>({ method: 'GET', path: `${V1}/me` }),

    /** Top-level comments, oldest first (spec §2.18). */
    getComments: (id: string, cursor: string | null, limit: number) =>
      request<CommentsPageDto>({ method: 'GET', path: `${post(id)}/comments?${query({ cursor, limit })}` }),

    getReplies: (id: string, commentId: string, cursor: string | null, limit: number) =>
      request<CommentsPageDto>({
        method: 'GET',
        path: `${comment(id, commentId)}/replies?${query({ cursor, limit })}`,
      }),

    addComment: (id: string, body: CreateCommentDto) =>
      request<CommentDto>({ method: 'POST', path: `${post(id)}/comments`, body }),

    deleteComment: (id: string, commentId: string) =>
      request<void>({ method: 'DELETE', path: comment(id, commentId) }),

    /** 202 `ReportFiledDto`; the page needs nothing from it. */
    reportComment: (id: string, commentId: string, body: ReportCommentDto) =>
      request<unknown>({ method: 'POST', path: `${comment(id, commentId)}/report`, body }),
  };
}
