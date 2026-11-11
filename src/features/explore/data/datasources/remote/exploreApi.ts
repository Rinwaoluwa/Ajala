import type {
  FeedPageDto,
  InterestDto,
  MapPinsDto,
  MeIdDto,
  PeoplePageDto,
  PostDetailDto,
  PostSearchPageDto,
  PostTypeDto,
  ReportPostDto,
  RsvpStateResponseDto,
} from '../../dto/exploreDtos';

/** The API's version prefix, as every other client in the app writes it. */
const V1 = '/api/v1';

/**
 * Explore's endpoints as the signed-in person (spec §2.11–2.13, API map §6–7).
 * `request` is auth's `AuthorizedRequest`, which attaches and refreshes the token.
 *
 * No city search here: `GET /cities` is gone, so the map's search uses
 * `@core/places` on the phone.
 */
export type ExploreRequest = <T>(request: {
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
  retry?: boolean;
}) => Promise<T>;

/** A list value is sent once per item (`interestIds=a&interestIds=b`), as the spec repeats arrays. */
const query = (params: Record<string, string | number | readonly string[] | null>) =>
  Object.entries(params)
    .flatMap(([k, v]) => (v === null ? [] : Array.isArray(v) ? v.map((item) => [k, item]) : [[k, v]]))
    .map(([k, v]) => `${encodeURIComponent(String(k))}=${encodeURIComponent(String(v))}`)
    .join('&');

/** `GET /search/posts`: words (2–100 characters), interests (up to 10), or both. */
export type PostSearchParams = {
  q: string | null;
  interestIds: readonly string[];
  type: PostTypeDto | null;
};

type Headers = Record<string, string> | null;

export function createExploreApi(request: ExploreRequest) {
  return {
    /**
     * `bbox` is `west,south,east,north`, under 5° a side (20° for a subscriber);
     * `q` keeps pins whose title contains it. 404 NO_LOCATION without a location
     * or a teleport; `reach` says whether the box or only 30 km round the origin counts.
     */
    getPins: (bbox: string, type: PostTypeDto | null, q: string | null, headers: Headers) =>
      request<MapPinsDto>({
        method: 'GET',
        path: `${V1}/map/pins?${query({ bbox, type, q })}`,
        headers: headers ?? undefined,
      }),

    getPost: (postId: string, headers: Headers) =>
      request<PostDetailDto>({
        method: 'GET',
        path: `${V1}/posts/${encodeURIComponent(postId)}`,
        headers: headers ?? undefined,
      }),

    rsvp: (postId: string) =>
      request<RsvpStateResponseDto>({
        method: 'POST',
        path: `${V1}/posts/${encodeURIComponent(postId)}/rsvp`,
      }),

    /** Who is signed in; only the id is read. */
    me: () => request<MeIdDto>({ method: 'GET', path: `${V1}/me` }),

    linkClick: (postId: string) =>
      request<void>({ method: 'POST', path: `${V1}/posts/${encodeURIComponent(postId)}/link-click` }),

    report: (postId: string, body: ReportPostDto) =>
      request<{ id: string }>({
        method: 'POST',
        path: `${V1}/posts/${encodeURIComponent(postId)}/report`,
        body,
      }),

    listInterests: () => request<InterestDto[]>({ method: 'GET', path: `${V1}/interests` }),

    /** The feed of one type (Explore asks for `meetup`); the server picks where it looks. */
    getFeed: (type: PostTypeDto | 'all', cursor: string | null, limit: number, headers: Headers) =>
      request<FeedPageDto>({
        method: 'GET',
        path: `${V1}/feed?${query({ type, cursor, limit })}`,
        headers: headers ?? undefined,
      }),

    /** First name or handle (a leading `@` is fine), 2–100 characters; not tied to where the feed looks. */
    searchPeople: (q: string, cursor: string | null, limit: number) =>
      request<PeoplePageDto>({ method: 'GET', path: `${V1}/search/people?${query({ q, cursor, limit })}` }),

    /** 400 with neither `q` nor interests; 404 NO_LOCATION. */
    searchPosts: (params: PostSearchParams, cursor: string | null, limit: number, headers: Headers) =>
      request<PostSearchPageDto>({
        method: 'GET',
        path: `${V1}/search/posts?${query({
          q: params.q,
          interestIds: params.interestIds,
          type: params.type,
          cursor,
          limit,
        })}`,
        headers: headers ?? undefined,
      }),
  };
}

export type ExploreApi = ReturnType<typeof createExploreApi>;
